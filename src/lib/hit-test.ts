// 화면 픽셀 기준 히트 테스트 (slice 11)
// 지도 탭이 핀 근처면 추가 흐름 대신 그 핀을 여는 데 사용.

export type PixelPoint = { x: number; y: number };

/** 탭 지점이 핀 탭으로 간주되는 화면 거리 (px) */
export const PIN_HIT_RADIUS_PX = 30;

export function findNearestWithin<T extends PixelPoint>(
  items: T[],
  target: PixelPoint,
  radiusPx: number,
): T | null {
  let nearest: T | null = null;
  let nearestDist = Infinity;
  for (const item of items) {
    const dist = Math.hypot(item.x - target.x, item.y - target.y);
    if (dist < nearestDist) {
      nearest = item;
      nearestDist = dist;
    }
  }
  return nearest && nearestDist <= radiusPx ? nearest : null;
}
