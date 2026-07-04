import { describe, it, expect } from "vitest";

// 툴체인 확인용 스모크 테스트 (슬라이스 1 시작 시 삭제 예정)
describe("toolchain smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
