// 카카오 로컬 키워드 검색 응답 → 우리 Place 후보 변환 (spec 규칙 5)

/** 카카오 응답 documents 항목 중 우리가 쓰는 필드 */
export type KakaoDocument = {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도(lng), 문자열
  y: string; // 위도(lat), 문자열
};

export type PlaceCandidate = {
  kakaoId: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
};

export function mapKakaoDocuments(docs: KakaoDocument[]): PlaceCandidate[] {
  return docs.flatMap((doc) => {
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [
      {
        kakaoId: doc.id,
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        category: doc.category_name.split(">").at(-1)?.trim() ?? "",
        lat,
        lng,
      },
    ];
  });
}

/** 카테고리 검색(x,y 기준) 응답 — distance(m, 문자열) 포함 */
export type KakaoNearbyDocument = KakaoDocument & { distance: string };

export type NearbyCandidate = PlaceCandidate & { distanceM: number };

const NEARBY_LIMIT = 15;

/** 여러 카테고리 결과를 kakaoId dedupe + 거리순으로 병합한다 (slice 6, AC1) */
export function mergeNearby(
  lists: KakaoNearbyDocument[][],
): NearbyCandidate[] {
  const byId = new Map<string, NearbyCandidate>();
  for (const docs of lists) {
    for (const doc of docs) {
      if (byId.has(doc.id)) continue;
      const [mapped] = mapKakaoDocuments([doc]);
      if (!mapped) continue;
      byId.set(doc.id, { ...mapped, distanceM: Number(doc.distance) || 0 });
    }
  }
  return [...byId.values()]
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, NEARBY_LIMIT);
}
