import { describe, it, expect } from "vitest";
import { PALETTE, assignColor } from "./colors";

describe("PALETTE", () => {
  it("10개의 고유한 #RRGGBB 색상으로 구성된다", () => {
    expect(PALETTE).toHaveLength(10);
    expect(new Set(PALETTE).size).toBe(10);
    for (const color of PALETTE) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("assignColor", () => {
  // AC1: 사용되지 않은 색을 팔레트 순서대로 배정
  it("아무도 없으면 팔레트 첫 번째 색을 배정한다", () => {
    expect(assignColor([])).toBe(PALETTE[0]);
  });

  it("사용 중인 색을 건너뛰고 첫 미사용 색을 배정한다", () => {
    expect(assignColor([PALETTE[0]])).toBe(PALETTE[1]);
    expect(assignColor([PALETTE[0], PALETTE[1]])).toBe(PALETTE[2]);
  });

  it("중간 색만 사용 중이면 앞의 미사용 색을 먼저 배정한다", () => {
    expect(assignColor([PALETTE[3]])).toBe(PALETTE[0]);
  });

  // AC2: 팔레트 소진 시 처음부터 재사용
  it("10색이 모두 사용 중이면 첫 번째 색을 재사용한다", () => {
    expect(assignColor([...PALETTE])).toBe(PALETTE[0]);
  });

  it("11명째(첫 색 2회 사용)에는 두 번째 색을 배정한다", () => {
    // 10색 소진 + 첫 색 재사용 1회 → 다음은 두 번째 색
    expect(assignColor([...PALETTE, PALETTE[0]])).toBe(PALETTE[1]);
  });

  it("팔레트에 없는 색이 섞여 있어도 무시하고 동작한다", () => {
    expect(assignColor(["#123456"])).toBe(PALETTE[0]);
  });
});
