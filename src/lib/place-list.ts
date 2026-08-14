import type { Place } from "./places";

/**
 * id 기준 upsert (spec 규칙 3).
 * 내가 저장한 핀(로컬 추가)과 실시간 이벤트로 온 같은 핀의 중복을 막는다.
 */
export function upsertPlace(list: Place[], incoming: Place): Place[] {
  const index = list.findIndex((p) => p.id === incoming.id);
  if (index === -1) return [...list, incoming];
  const next = [...list];
  next[index] = incoming;
  return next;
}

/** id의 핀을 제거한다. 없으면 그대로 (삭제 실시간 반영용) */
export function removePlace(list: Place[], id: string): Place[] {
  return list.filter((p) => p.id !== id);
}

export type PlaceSort = "latest" | "rating";

/** 목록 정렬 (slice 13): 최신순 또는 별점순(동률은 최신 우선) */
export function sortPlaces(list: Place[], sort: PlaceSort): Place[] {
  const byLatest = (a: Place, b: Place) =>
    b.createdAt.localeCompare(a.createdAt);
  return [...list].sort(
    sort === "latest"
      ? byLatest
      : (a, b) => b.rating - a.rating || byLatest(a, b),
  );
}

export type Author = { userId: string; name: string; color: string };

/** 핀 목록에서 중복 없는 작성자 목록 (첫 등장 순) — 친구 필터 칩용 (slice 10) */
export function uniqueAuthors(list: Place[]): Author[] {
  const byId = new Map<string, Author>();
  for (const p of list) {
    if (!byId.has(p.userId)) {
      byId.set(p.userId, {
        userId: p.userId,
        name: p.author.name,
        color: p.author.color,
      });
    }
  }
  return [...byId.values()];
}
