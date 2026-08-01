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
};

type PlaceRow = {
  id: string;
  user_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  users: { name: string; color: string } | null;
};

const SELECT = "id, user_id, name, address, lat, lng, rating, users(name, color)";

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating,
    author: row.users ?? { name: "?", color: "#888888" },
  };
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
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(`맛집 저장 실패: ${error.message}`);
  return toPlace(data as unknown as PlaceRow);
}
