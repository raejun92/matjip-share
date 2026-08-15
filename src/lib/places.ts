import { supabase } from "./supabase";
import { isValidRating } from "./rating";

export type Place = {
  id: string;
  userId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  /** 작성자 한줄평 (선택, 최대 200자) — slice 19 */
  comment: string;
  createdAt: string;
  /** 작성자 (users join) — 핀 색상/정보 표시에 사용 */
  author: { name: string; color: string };
};

export type NewPlace = {
  userId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  comment?: string;
};

type PlaceRow = {
  id: string;
  user_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  comment: string;
  created_at: string;
  users: { name: string; color: string } | null;
};

const SELECT =
  "id, user_id, name, address, lat, lng, rating, comment, created_at, users(name, color)";

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    author: row.users ?? { name: "?", color: "#888888" },
  };
}

/** 핀 하나 조회 (작성자 포함) — 실시간 이벤트 수신 시 사용. 없으면 null */
export async function getPlaceById(id: string): Promise<Place | null> {
  const { data, error } = await supabase
    .from("places")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`맛집 조회 실패: ${error.message}`);
  return data ? toPlace(data as unknown as PlaceRow) : null;
}

/** 전체 핀 조회 (작성자 이름·색상 포함) — AC4 */
export async function getPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from("places")
    .select(SELECT)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`맛집 조회 실패: ${error.message}`);
  return (data as unknown as PlaceRow[]).map(toPlace);
}

/** 핀 저장 — AC3 */
export async function addPlace(input: NewPlace): Promise<Place> {
  if (!isValidRating(input.rating)) {
    throw new Error("별점은 1~5 사이 정수여야 합니다.");
  }
  const { data, error } = await supabase
    .from("places")
    .insert({
      user_id: input.userId,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      rating: input.rating,
      comment: (input.comment ?? "").trim().slice(0, 200),
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(`맛집 저장 실패: ${error.message}`);
  return toPlace(data as unknown as PlaceRow);
}

/** 별점·한줄평 수정 (본인 핀 제한은 UI 레벨 — PRD §6.6) */
export async function updatePlaceDetails(
  id: string,
  details: { rating: number; comment: string },
): Promise<Place> {
  if (!isValidRating(details.rating)) {
    throw new Error("별점은 1~5 사이 정수여야 합니다.");
  }
  const { data, error } = await supabase
    .from("places")
    .update({
      rating: details.rating,
      comment: details.comment.trim().slice(0, 200),
    })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(`수정 실패: ${error.message}`);
  return toPlace(data as unknown as PlaceRow);
}

/** 핀 삭제 (본인 핀 제한은 UI 레벨 — PRD §6.6) */
export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from("places").delete().eq("id", id);
  if (error) throw new Error(`삭제 실패: ${error.message}`);
}
