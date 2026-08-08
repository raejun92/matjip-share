import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { subscribeToPlaces } from "./realtime";
import { getOrCreateUser } from "./users";

// 로컬 Supabase Realtime 대상 통합 테스트 (AC2)
const admin = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
);

const suffix = crypto.randomUUID().slice(0, 6);
let cleanupUserId: string | null = null;
let cleanupUserId2: string | null = null;

afterAll(async () => {
  for (const userId of [cleanupUserId, cleanupUserId2]) {
    if (userId) {
      await admin.from("places").delete().eq("user_id", userId);
      await admin.from("users").delete().eq("id", userId);
    }
  }
});

// 다른 통합 테스트와 병렬 실행 시 로컬 Realtime 경합으로 간헐 실패 → 재시도 허용
describe("subscribeToPlaces (로컬 Supabase Realtime)", { retry: 2 }, () => {
  it("places INSERT 시 구독자에게 해당 id가 전달된다", async () => {
    const author = await getOrCreateUser(`실시간-${suffix}`.slice(0, 12));
    cleanupUserId = author.id;

    const received = new Promise<string>((resolve) => {
      const unsubscribe = subscribeToPlaces({
        onInsert: (id) => {
          unsubscribe();
          resolve(id);
        },
      });
    });

    // 구독이 서버에 연결될 시간을 준 뒤 INSERT
    await new Promise((r) => setTimeout(r, 1500));
    const { data: inserted, error } = await admin
      .from("places")
      .insert({
        user_id: author.id,
        name: "실시간 확인집",
        address: "",
        lat: 37.5,
        lng: 127.0,
        rating: 5,
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const receivedId = await Promise.race([
      received,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("10초 내 실시간 이벤트 미수신")), 10_000),
      ),
    ]);
    expect(receivedId).toBe(inserted!.id);
  }, 20_000);

  // AC3(슬라이스 5): UPDATE·DELETE 이벤트 전달
  it("UPDATE와 DELETE 이벤트도 구독자에게 전달된다", async () => {
    const author = await getOrCreateUser(`실시간2-${suffix}`.slice(0, 12));
    cleanupUserId2 = author.id;

    const events: { type: string; id: string }[] = [];
    let resolveDone: () => void;
    const done = new Promise<void>((r) => (resolveDone = r));
    const unsubscribe = subscribeToPlaces({
      onInsert: (id) => events.push({ type: "insert", id }),
      onUpdate: (id) => events.push({ type: "update", id }),
      onDelete: (id) => {
        events.push({ type: "delete", id });
        resolveDone();
      },
    });

    await new Promise((r) => setTimeout(r, 1500));
    const { data: row } = await admin
      .from("places")
      .insert({
        user_id: author.id,
        name: "수정삭제 확인집",
        address: "",
        lat: 37.5,
        lng: 127.0,
        rating: 2,
      })
      .select("id")
      .single();
    await new Promise((r) => setTimeout(r, 500));
    await admin.from("places").update({ rating: 4 }).eq("id", row!.id);
    await new Promise((r) => setTimeout(r, 500));
    await admin.from("places").delete().eq("id", row!.id);

    await Promise.race([
      done,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("10초 내 delete 이벤트 미수신")), 10_000),
      ),
    ]);
    unsubscribe();

    expect(events).toContainEqual({ type: "insert", id: row!.id });
    expect(events).toContainEqual({ type: "update", id: row!.id });
    expect(events).toContainEqual({ type: "delete", id: row!.id });
  }, 20_000);
});
