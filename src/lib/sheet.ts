// 바텀 시트 드래그 스냅 (slice 9)

export const SHEET_SNAP = {
  default: 0.45,
  expanded: 0.85,
} as const;

const CLOSE_THRESHOLD = 0.3;

/** 드래그를 놓은 높이 비율(0~1)을 스냅 지점으로 판정한다 */
export function snapSheetRatio(ratio: number): number | "close" {
  if (ratio < CLOSE_THRESHOLD) return "close";
  const midpoint = (SHEET_SNAP.default + SHEET_SNAP.expanded) / 2;
  return ratio >= midpoint ? SHEET_SNAP.expanded : SHEET_SNAP.default;
}
