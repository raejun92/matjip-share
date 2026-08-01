import { describe, it, expect } from "vitest";
import { upsertPlace, removePlace } from "./place-list";
import type { Place } from "./places";

const place = (id: string, name = "집", rating = 3): Place => ({
  id,
  userId: "u1",
  name,
  address: "",
  lat: 37.5,
  lng: 127.0,
  rating,
  author: { name: "친구", color: "#E6194B" },
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
