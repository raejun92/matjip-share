import { describe, it, expect, beforeEach } from "vitest";
import { loadSessionUserId, saveSessionUserId, clearSessionUserId } from "./session";

// 재접속 시 "나는 누구" 기억 (spec 규칙 1, 4) — jsdom localStorage 사용
describe("session (localStorage)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("저장한 user id를 다시 읽을 수 있다", () => {
    saveSessionUserId("abc-123");
    expect(loadSessionUserId()).toBe("abc-123");
  });

  it("저장한 적 없으면 null을 반환한다", () => {
    expect(loadSessionUserId()).toBeNull();
  });

  it("clear 후에는 null을 반환한다 (DB에서 사용자가 사라진 경우 복구용)", () => {
    saveSessionUserId("abc-123");
    clearSessionUserId();
    expect(loadSessionUserId()).toBeNull();
  });
});
