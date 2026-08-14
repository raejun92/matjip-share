import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateUser, getUserById, renameUser } from "./users";
import { PALETTE } from "./colors";

// 로컬 Supabase 스택(supabase start) 대상 통합 테스트.
// 테스트 데이터 정리는 RLS를 우회하는 로컬 service role 키 사용 (공개 개발용 값).
const admin = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
);

const suffix = crypto.randomUUID().slice(0, 6);
const testName = (base: string) => `${base}-${suffix}`.slice(0, 12);
const createdNames: string[] = [];

afterAll(async () => {
  if (createdNames.length > 0) {
    await admin.from("users").delete().in("name", createdNames);
  }
});

describe("getOrCreateUser (로컬 Supabase)", () => {
  // AC4: 새 이름 제출 시 users에 name+color 저장
  it("새 이름이면 사용자를 생성하고 팔레트 색을 배정한다", async () => {
    const name = testName("새친구");
    createdNames.push(name);

    const user = await getOrCreateUser(name);

    expect(user.id).toBeTruthy();
    expect(user.name).toBe(name);
    expect(PALETTE).toContain(user.color);
  });

  // AC5: 기존 이름 제출 시 새 행을 만들지 않고 기존 사용자 반환
  it("같은 이름으로 다시 부르면 동일한 사용자를 반환한다", async () => {
    const name = testName("중복친구");
    createdNames.push(name);

    const first = await getOrCreateUser(name);
    const second = await getOrCreateUser(name);

    expect(second.id).toBe(first.id);
    expect(second.color).toBe(first.color);

    const { data: rows } = await admin
      .from("users")
      .select("id")
      .eq("name", name);
    expect(rows).toHaveLength(1);
  });

  it("서로 다른 사용자는 서로 다른 색을 배정받는다 (팔레트 여유 시)", async () => {
    const nameA = testName("친구a");
    const nameB = testName("친구b");
    createdNames.push(nameA, nameB);

    const a = await getOrCreateUser(nameA);
    const b = await getOrCreateUser(nameB);

    // 전체 사용자 수가 팔레트보다 적을 때만 의미 있는 검증
    const { data: allRows } = await admin.from("users").select("id");
    if ((allRows?.length ?? 0) <= PALETTE.length) {
      expect(a.color).not.toBe(b.color);
    }
  });
});

// AC1(슬라이스 15): 이름 바꾸기
describe("renameUser (로컬 Supabase)", () => {
  it("이름을 바꾸면 id·색상은 유지되고 이름만 바뀐다", async () => {
    const before = testName("오타이름");
    const after = testName("고친이름");
    createdNames.push(before, after);

    const user = await getOrCreateUser(before);
    const renamed = await renameUser(user.id, after);

    expect(renamed.id).toBe(user.id);
    expect(renamed.color).toBe(user.color);
    expect(renamed.name).toBe(after);
  });

  it("이미 있는 이름으로는 바꿀 수 없다", async () => {
    const nameA = testName("주인장");
    const nameB = testName("점유된");
    createdNames.push(nameA, nameB);

    const a = await getOrCreateUser(nameA);
    await getOrCreateUser(nameB);

    await expect(renameUser(a.id, nameB)).rejects.toThrow(/이미 사용 중/);
  });

  it("13자 이상 이름은 DB 제약으로 거부된다", async () => {
    const name = testName("제약확인");
    createdNames.push(name);
    const user = await getOrCreateUser(name);
    await expect(renameUser(user.id, "가".repeat(13))).rejects.toThrow();
  });
});

describe("getUserById (로컬 Supabase)", () => {
  it("존재하는 id면 사용자를 반환한다", async () => {
    const name = testName("조회친구");
    createdNames.push(name);

    const created = await getOrCreateUser(name);
    const found = await getUserById(created.id);

    expect(found).toEqual(created);
  });

  it("존재하지 않는 id면 null을 반환한다", async () => {
    const found = await getUserById(crypto.randomUUID());
    expect(found).toBeNull();
  });
});
