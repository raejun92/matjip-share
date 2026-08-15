import { describe, it, expect } from "vitest";
import {
  mapKakaoDocuments,
  mergeNearby,
  pickDirectSuggestions,
  type PlaceCandidate,
  type NearbyCandidate,
} from "./place-search";

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

// AC1(슬라이스 6): 카테고리 검색 결과 병합 — kakaoId dedupe + 거리순
const nearbyDoc = (id: string, distance: string, name = "가게" + id) => ({
  ...kakaoDoc,
  id,
  place_name: name,
  distance,
});

describe("mergeNearby", () => {
  it("두 목록을 거리순으로 병합한다", () => {
    const food = [nearbyDoc("a", "120"), nearbyDoc("b", "40")];
    const cafe = [nearbyDoc("c", "80")];
    const result = mergeNearby([food, cafe]);
    expect(result.map((r) => r.kakaoId)).toEqual(["b", "c", "a"]);
  });

  it("같은 kakaoId는 한 번만 남긴다", () => {
    const result = mergeNearby([
      [nearbyDoc("a", "50")],
      [nearbyDoc("a", "50"), nearbyDoc("b", "60")],
    ]);
    expect(result.map((r) => r.kakaoId)).toEqual(["a", "b"]);
  });

  it("distance를 숫자(m)로 변환해 담는다", () => {
    const [first] = mergeNearby([[nearbyDoc("a", "77")]]);
    const expected: NearbyCandidate = {
      kakaoId: "a",
      name: "가게a",
      address: "서울 중구 세종대로 지하 101",
      category: "스타벅스",
      lat: 37.5668245376668,
      lng: 126.977943192076,
      distanceM: 77,
    };
    expect(first).toEqual(expected);
  });

  it("최대 15개까지만 반환한다", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      nearbyDoc(`id${i}`, String(i)),
    );
    expect(mergeNearby([many])).toHaveLength(15);
  });

  it("좌표가 깨진 항목은 제외한다", () => {
    const bad = { ...nearbyDoc("bad", "10"), x: "??" };
    const result = mergeNearby([[bad, nearbyDoc("ok", "20")]]);
    expect(result.map((r) => r.kakaoId)).toEqual(["ok"]);
  });
});

// AC1(슬라이스 7): 가게 탭 판정 — 최근접이 임계값 이내면 바로 제안
const candidate = (id: string, distanceM: number): NearbyCandidate => ({
  kakaoId: id,
  name: "가게" + id,
  address: "",
  category: "",
  lat: 37.5,
  lng: 127.0,
  distanceM,
});

describe("pickDirectSuggestions", () => {
  it("임계값 내 후보가 하나면 그 하나만 반환한다", () => {
    const list = [candidate("a", 12), candidate("b", 80)];
    expect(pickDirectSuggestions(list, 30).map((c) => c.kakaoId)).toEqual(["a"]);
  });

  it("같은 건물(동률 0m) 후보들은 모두 반환한다 — 홍미관/꾼들의공연 케이스", () => {
    const list = [candidate("꾼들의공연", 0), candidate("홍미관", 0)];
    expect(pickDirectSuggestions(list, 30).map((c) => c.kakaoId)).toEqual([
      "꾼들의공연",
      "홍미관",
    ]);
  });

  it("임계값 내 후보를 가까운 순으로 정렬해 반환한다", () => {
    const list = [candidate("b", 25), candidate("a", 5), candidate("far", 200)];
    expect(pickDirectSuggestions(list, 30).map((c) => c.kakaoId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("최대 3곳까지만 반환한다", () => {
    const list = [
      candidate("a", 1),
      candidate("b", 2),
      candidate("c", 3),
      candidate("d", 4),
    ];
    expect(pickDirectSuggestions(list, 30)).toHaveLength(3);
  });

  it("경계값(정확히 임계값)도 포함한다", () => {
    expect(pickDirectSuggestions([candidate("a", 30)], 30)).toHaveLength(1);
  });

  it("임계값 내 후보가 없으면 빈 배열", () => {
    expect(pickDirectSuggestions([candidate("a", 31)], 30)).toEqual([]);
    expect(pickDirectSuggestions([], 30)).toEqual([]);
  });
});
