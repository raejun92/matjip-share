import { describe, it, expect } from "vitest";
import { snapSheetRatio, SHEET_SNAP } from "./sheet";

// AC1(슬라이스 9): 드래그를 놓은 높이 비율 → close / 기본 / 확장 스냅
describe("snapSheetRatio", () => {
  it("닫힘 임계값(0.3) 미만이면 close", () => {
    expect(snapSheetRatio(0.1)).toBe("close");
    expect(snapSheetRatio(0.29)).toBe("close");
  });

  it("기본(0.45)에 가까우면 기본 스냅", () => {
    expect(snapSheetRatio(0.31)).toBe(SHEET_SNAP.default);
    expect(snapSheetRatio(0.5)).toBe(SHEET_SNAP.default);
    expect(snapSheetRatio(0.6)).toBe(SHEET_SNAP.default);
  });

  it("확장(0.85)에 가까우면 확장 스냅", () => {
    expect(snapSheetRatio(0.7)).toBe(SHEET_SNAP.expanded);
    expect(snapSheetRatio(0.95)).toBe(SHEET_SNAP.expanded);
  });

  it("정확히 중간이면 확장 쪽을 택한다 (올리는 의도 존중)", () => {
    const mid = (SHEET_SNAP.default + SHEET_SNAP.expanded) / 2;
    expect(snapSheetRatio(mid)).toBe(SHEET_SNAP.expanded);
  });
});
