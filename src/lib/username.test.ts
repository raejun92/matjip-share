import { describe, it, expect } from "vitest";
import { normalizeName } from "./username";

// AC3: 이름은 trim 후 1~12자만 유효
describe("normalizeName", () => {
  it("앞뒤 공백을 제거한 이름을 반환한다", () => {
    expect(normalizeName("  래준  ")).toEqual({ ok: true, name: "래준" });
  });

  it("1자 이름도 유효하다", () => {
    expect(normalizeName("김")).toEqual({ ok: true, name: "김" });
  });

  it("12자 이름은 유효하다", () => {
    const name = "가".repeat(12);
    expect(normalizeName(name)).toEqual({ ok: true, name });
  });

  it("빈 문자열은 거부한다", () => {
    expect(normalizeName("").ok).toBe(false);
  });

  it("공백만 있는 이름은 거부한다", () => {
    expect(normalizeName("   ").ok).toBe(false);
  });

  it("13자 이상은 거부한다", () => {
    expect(normalizeName("가".repeat(13)).ok).toBe(false);
  });

  it("거부 시 사용자에게 보여줄 메시지를 포함한다", () => {
    const result = normalizeName("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
