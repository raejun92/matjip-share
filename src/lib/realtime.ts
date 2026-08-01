import { supabase } from "./supabase";

type Handlers = {
  /** places에 새 행이 INSERT되면 그 id로 호출된다 */
  onInsert: (placeId: string) => void;
  /** 별점 등 UPDATE 시 호출 (슬라이스 5) */
  onUpdate?: (placeId: string) => void;
  /** DELETE 시 호출 — 페이로드엔 PK(id)만 온다 (슬라이스 5) */
  onDelete?: (placeId: string) => void;
};

/**
 * places 테이블 실시간 구독 (PRD §6.5).
 * 반환된 함수를 호출하면 구독이 해제된다.
 */
export function subscribeToPlaces({
  onInsert,
  onUpdate,
  onDelete,
}: Handlers): () => void {
  // 채널명은 구독마다 고유해야 한다 — 같은 이름을 재사용하면 기존 채널과 충돌
  const channel = supabase
    .channel(`places-changes-${crypto.randomUUID().slice(0, 8)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "places" },
      (payload) => {
        const id = (payload.new as { id?: string }).id;
        if (id) onInsert(id);
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "places" },
      (payload) => {
        const id = (payload.new as { id?: string }).id;
        if (id) onUpdate?.(id);
      },
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "places" },
      (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) onDelete?.(id);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
