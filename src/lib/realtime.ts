import { supabase } from "./supabase";

type Handlers = {
  /** places에 새 행이 INSERT되면 그 id로 호출된다 */
  onInsert: (placeId: string) => void;
};

/**
 * places 테이블 실시간 구독 (PRD §6.5).
 * 반환된 함수를 호출하면 구독이 해제된다.
 */
export function subscribeToPlaces({ onInsert }: Handlers): () => void {
  const channel = supabase
    .channel("places-changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "places" },
      (payload) => {
        const id = (payload.new as { id?: string }).id;
        if (id) onInsert(id);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
