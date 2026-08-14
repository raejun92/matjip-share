import { describe, it, expect } from "vitest";
import { findNearestWithin } from "./hit-test";

// AC1(슬라이스 11): 화면 픽셀 기준 반경 내 최근접 항목
describe("findNearestWithin", () => {
  const items = [
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 130, y: 100 },
  ];

  it("반경 내에서 가장 가까운 항목을 반환한다", () => {
    expect(findNearestWithin(items, { x: 105, y: 100 }, 30)?.id).toBe("a");
    expect(findNearestWithin(items, { x: 125, y: 100 }, 30)?.id).toBe("b");
  });

  it("반경(경계 포함) 밖이면 null", () => {
    expect(findNearestWithin(items, { x: 100, y: 131 }, 30)).toBeNull();
    expect(findNearestWithin(items, { x: 100, y: 130 }, 30)?.id).toBe("a");
  });

  it("빈 목록이면 null", () => {
    expect(findNearestWithin([], { x: 0, y: 0 }, 30)).toBeNull();
  });

  it("대각선 거리도 정확히 계산한다 (3-4-5)", () => {
    const diag = [{ id: "d", x: 103, y: 104 }]; // (100,100)에서 5px
    expect(findNearestWithin(diag, { x: 100, y: 100 }, 5)?.id).toBe("d");
    expect(findNearestWithin(diag, { x: 100, y: 100 }, 4.9)).toBeNull();
  });
});
