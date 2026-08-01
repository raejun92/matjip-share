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
