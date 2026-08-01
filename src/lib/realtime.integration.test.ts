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

afterAll(async () => {
  if (cleanupUserId) {
    await admin.from("places").delete().eq("user_id", cleanupUserId);
    await admin.from("users").delete().eq("id", cleanupUserId);
  }
});

describe("subscribeToPlaces (로컬 Supabase Realtime)", () => {
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
});
