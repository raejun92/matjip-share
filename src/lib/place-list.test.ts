import { describe, it, expect } from "vitest";
import {
  upsertPlace,
  removePlace,
  uniqueAuthors,
  sortPlaces,
  groupPlaces,
  placeGroupKey,
} from "./place-list";
import type { Place } from "./places";

const place = (id: string, name = "집", rating = 3): Place => ({
  id,
  userId: "u1",
  name,
  address: "",
  lat: 37.5,
  lng: 127.0,
  rating,
  comment: "",
  createdAt: "2026-08-01T00:00:00Z",
  author: { name: "친구", color: "#E6194B" },
});

const placeBy = (id: string, userId: string, authorName: string): Place => ({
  ...place(id),
  userId,
  author: { name: authorName, color: "#3CB44B" },
});

// AC1: id 기준 upsert — 같은 id는 교체, 새 id는 추가 (순서 유지)
describe("upsertPlace", () => {
  it("새 id면 목록 끝에 추가한다", () => {
    const list = [place("a")];
    const result = upsertPlace(list, place("b"));
    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("같은 id면 그 자리에서 교체한다 (중복 없음)", () => {
    const list = [place("a"), place("b", "옛이름", 2)];
    const result = upsertPlace(list, place("b", "새이름", 5));
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe("새이름");
    expect(result[1].rating).toBe(5);
  });

  it("빈 목록에도 추가된다", () => {
    expect(upsertPlace([], place("a"))).toHaveLength(1);
  });

  it("원본 배열을 변경하지 않는다 (React state 안전)", () => {
    const list = [place("a")];
    upsertPlace(list, place("b"));
    expect(list).toHaveLength(1);
  });
});

// AC1(슬라이스 5): id로 제거, 없으면 그대로
describe("removePlace", () => {
  it("해당 id의 핀을 제거한다", () => {
    const list = [place("a"), place("b"), place("c")];
    expect(removePlace(list, "b").map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("없는 id면 목록이 그대로다", () => {
    const list = [place("a")];
    expect(removePlace(list, "zzz")).toEqual(list);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const list = [place("a"), place("b")];
    removePlace(list, "a");
    expect(list).toHaveLength(2);
  });
});

// AC1(슬라이스 10): 중복 없는 작성자 목록 (첫 등장 순)
describe("uniqueAuthors", () => {
  it("작성자를 userId 기준으로 중복 없이 추출한다", () => {
    const list = [
      placeBy("p1", "u1", "래준"),
      placeBy("p2", "u2", "민수"),
      placeBy("p3", "u1", "래준"),
    ];
    const authors = uniqueAuthors(list);
    expect(authors).toHaveLength(2);
    expect(authors.map((a) => a.name)).toEqual(["래준", "민수"]);
    expect(authors[0]).toEqual({ userId: "u1", name: "래준", color: "#3CB44B" });
  });

  it("첫 등장 순서를 유지한다", () => {
    const list = [placeBy("p1", "u2", "민수"), placeBy("p2", "u1", "래준")];
    expect(uniqueAuthors(list).map((a) => a.userId)).toEqual(["u2", "u1"]);
  });

  it("빈 목록이면 빈 배열", () => {
    expect(uniqueAuthors([])).toEqual([]);
  });
});

// AC1(슬라이스 13): 목록 정렬
const placeAt = (id: string, createdAt: string, rating: number): Place => ({
  ...place(id, "집" + id, rating),
  createdAt,
});

describe("sortPlaces", () => {
  const list = [
    placeAt("old", "2026-08-01T00:00:00Z", 5),
    placeAt("new", "2026-08-10T00:00:00Z", 3),
    placeAt("mid", "2026-08-05T00:00:00Z", 5),
  ];

  it("최신순: createdAt 내림차순", () => {
    expect(sortPlaces(list, "latest").map((p) => p.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("별점순: rating 내림차순, 동률은 최신 우선", () => {
    expect(sortPlaces(list, "rating").map((p) => p.id)).toEqual([
      "mid",
      "old",
      "new",
    ]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const copy = [...list];
    sortPlaces(list, "latest");
    expect(list).toEqual(copy);
  });
});

// AC1(슬라이스 22): 같은 가게(이름+좌표) 핀 병합
const placeAtCoord = (
  id: string,
  userId: string,
  name: string,
  lat: number,
  lng: number,
): Place => ({
  ...placeBy(id, userId, "친구" + userId),
  name,
  lat,
  lng,
});

describe("groupPlaces", () => {
  it("이름+좌표가 같으면 한 그룹으로 묶는다 (같은 가게 두 명 저장)", () => {
    const list = [
      placeAtCoord("p1", "u1", "진주회관", 37.56, 126.97),
      placeAtCoord("p2", "u2", "진주회관", 37.56, 126.97),
    ];
    const groups = groupPlaces(list);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("진주회관");
    expect(groups[0].entries.map((e) => e.id)).toEqual(["p1", "p2"]);
  });

  it("이름이 같아도 좌표가 다르면 다른 그룹 (체인점)", () => {
    const list = [
      placeAtCoord("p1", "u1", "스타벅스", 37.56, 126.97),
      placeAtCoord("p2", "u2", "스타벅스", 35.17, 129.07),
    ];
    expect(groupPlaces(list)).toHaveLength(2);
  });

  it("좌표가 같아도 이름이 다르면 다른 그룹 (같은 건물)", () => {
    const list = [
      placeAtCoord("p1", "u1", "홍미관", 35.2, 129.0),
      placeAtCoord("p2", "u2", "꾼들의공연", 35.2, 129.0),
    ];
    expect(groupPlaces(list)).toHaveLength(2);
  });

  it("첫 등장 순서를 유지한다", () => {
    const list = [
      placeAtCoord("p1", "u1", "B집", 37.5, 127.0),
      placeAtCoord("p2", "u2", "A집", 37.6, 127.1),
      placeAtCoord("p3", "u3", "B집", 37.5, 127.0),
    ];
    expect(groupPlaces(list).map((g) => g.name)).toEqual(["B집", "A집"]);
  });

  it("selected가 속한 그룹을 key로 찾을 수 있다", () => {
    const a = placeAtCoord("p1", "u1", "진주회관", 37.56, 126.97);
    const b = placeAtCoord("p2", "u2", "진주회관", 37.56, 126.97);
    expect(placeGroupKey(a)).toBe(placeGroupKey(b));
    expect(placeGroupKey(a)).not.toBe(
      placeGroupKey(placeAtCoord("p3", "u3", "딴집", 37.56, 126.97)),
    );
  });
});
