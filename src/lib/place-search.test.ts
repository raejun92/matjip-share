import { describe, it, expect } from "vitest";
import { mapKakaoDocuments, type PlaceCandidate } from "./place-search";

// 카카오 로컬 키워드 검색 응답의 documents 항목 (실제 형태 발췌)
const kakaoDoc = {
  id: "26338954",
  place_name: "스타벅스 시청점",
  category_name: "음식점 > 카페 > 커피전문점 > 스타벅스",
  address_name: "서울 중구 태평로1가 84-11",
  road_address_name: "서울 중구 세종대로 지하 101",
  x: "126.977943192076",
  y: "37.5668245376668",
};

// AC2: 카카오 응답 → Place 후보 변환
describe("mapKakaoDocuments", () => {
  it("문자열 좌표를 숫자 lat/lng로 변환한다", () => {
    const [candidate] = mapKakaoDocuments([kakaoDoc]);
    expect(candidate.lat).toBeCloseTo(37.5668245376668);
    expect(candidate.lng).toBeCloseTo(126.977943192076);
  });

  it("가게명과 주소를 담는다 (도로명 주소 우선)", () => {
    const [candidate] = mapKakaoDocuments([kakaoDoc]);
    expect(candidate.name).toBe("스타벅스 시청점");
    expect(candidate.address).toBe("서울 중구 세종대로 지하 101");
  });

  it("도로명 주소가 없으면 지번 주소를 쓴다", () => {
    const [candidate] = mapKakaoDocuments([
      { ...kakaoDoc, road_address_name: "" },
    ]);
    expect(candidate.address).toBe("서울 중구 태평로1가 84-11");
  });

  it("좌표가 숫자로 해석되지 않는 항목은 제외한다", () => {
    const result = mapKakaoDocuments([
      kakaoDoc,
      { ...kakaoDoc, id: "bad", x: "not-a-number" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].kakaoId).toBe("26338954");
  });

  it("빈 목록은 빈 배열을 반환한다", () => {
    expect(mapKakaoDocuments([])).toEqual([]);
  });

  it("PlaceCandidate 타입 필드를 모두 채운다", () => {
    const [c] = mapKakaoDocuments([kakaoDoc]);
    const expected: PlaceCandidate = {
      kakaoId: "26338954",
      name: "스타벅스 시청점",
      address: "서울 중구 세종대로 지하 101",
      category: "스타벅스",
      lat: 37.5668245376668,
      lng: 126.977943192076,
    };
    expect(c).toEqual(expected);
  });
});
