// 6~10명을 뚜렷이 구분하는 고대비 팔레트 (PRD §6.2)
export const PALETTE = [
  "#E6194B", // 빨강
  "#3CB44B", // 초록
  "#4363D8", // 파랑
  "#F58231", // 주황
  "#911EB4", // 보라
  "#42D4F4", // 하늘
  "#F032E6", // 자홍
  "#9A6324", // 갈색
  "#000075", // 남색
  "#808000", // 올리브
] as const;

/**
 * 사용 중인 색 목록을 받아 다음 배정 색을 고른다.
 * 미사용 색을 팔레트 순서대로 우선 배정하고,
 * 팔레트 소진 시 사용 횟수가 가장 적은 색부터 재사용한다.
 */
export function assignColor(usedColors: string[]): string {
  const counts = new Map<string, number>(PALETTE.map((c) => [c, 0]));
  for (const color of usedColors) {
    if (counts.has(color)) {
      counts.set(color, counts.get(color)! + 1);
    }
  }
  let best: string = PALETTE[0];
  let bestCount = Infinity;
  for (const color of PALETTE) {
    const count = counts.get(color)!;
    if (count < bestCount) {
      best = color;
      bestCount = count;
    }
  }
  return best;
}
