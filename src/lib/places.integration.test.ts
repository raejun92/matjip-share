import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateUser, type User } from "./users";
import {
  addPlace,
  getPlaces,
  updatePlaceDetails,
  deletePlace,
  getPlaceById,
} from "./places";

// 로컬 Supabase 스택 대상 통합 테스트 (users와 동일 패턴)
const admin = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
);

const suffix = crypto.randomUUID().slice(0, 6);
let author: User;

beforeAll(async () => {
  author = await getOrCreateUser(`핀친구-${suffix}`.slice(0, 12));
});

afterAll(async () => {
  await admin.from("places").delete().eq("user_id", author.id);
  await admin.from("users").delete().eq("id", author.id);
});

describe("addPlace / getPlaces (로컬 Supabase)", () => {
  // AC3: 핀 저장 시 작성자와 함께 저장
  it("핀을 저장하면 작성자 정보와 함께 반환된다", async () => {
    const place = await addPlace({
      userId: author.id,
      name: "테스트 국밥집",
      address: "서울 어딘가 1-2",
      lat: 37.5,
      lng: 127.0,
      rating: 4,
    });

    expect(place.id).toBeTruthy();
    expect(place.name).toBe("테스트 국밥집");
    expect(place.rating).toBe(4);
    expect(place.author).toEqual({ name: author.name, color: author.color });
  });

  // AC4: 전체 조회 시 작성자 이름·색상 포함
  it("전체 조회에 방금 저장한 핀이 작성자 색과 함께 온다", async () => {
    const places = await getPlaces();
    const mine = places.filter((p) => p.userId === author.id);
    expect(mine.length).toBeGreaterThanOrEqual(1);
    expect(mine[0].author.color).toBe(author.color);
  });

  it("범위 밖 별점은 저장 전에 거부된다", async () => {
    await expect(
      addPlace({
        userId: author.id,
        name: "이상한 별점집",
        address: "",
        lat: 37.5,
        lng: 127.0,
        rating: 7,
      }),
    ).rejects.toThrow(/별점/);
  });

  it("존재하지 않는 작성자로는 저장할 수 없다 (FK)", async () => {
    await expect(
      addPlace({
        userId: crypto.randomUUID(),
        name: "유령 작성자집",
        address: "",
        lat: 37.5,
        lng: 127.0,
        rating: 3,
      }),
    ).rejects.toThrow();
  });
});

// AC2(슬라이스 5): 수정/삭제가 DB에 반영된다
describe("updatePlaceRating / deletePlace (로컬 Supabase)", () => {
  it("별점·한줄평을 수정하면 반영된 핀을 반환한다", async () => {
    const place = await addPlace({
      userId: author.id,
      name: "별점 바꿀 집",
      address: "",
      lat: 37.5,
      lng: 127.0,
      rating: 2,
    });
    expect(place.comment).toBe("");

    const updated = await updatePlaceDetails(place.id, {
      rating: 5,
      comment: "  콩국수 미쳤음  ",
    });
    expect(updated.rating).toBe(5);
    expect(updated.comment).toBe("콩국수 미쳤음"); // trim 확인
    expect(updated.id).toBe(place.id);
    expect(updated.author.name).toBe(author.name);
  });

  it("한줄평 포함 저장이 반영된다 (AC1)", async () => {
    const place = await addPlace({
      userId: author.id,
      name: "한줄평 집",
      address: "",
      lat: 37.5,
      lng: 127.0,
      rating: 4,
      comment: "웨이팅 김. 오픈런 추천",
    });
    expect(place.comment).toBe("웨이팅 김. 오픈런 추천");
    const fetched = await getPlaceById(place.id);
    expect(fetched?.comment).toBe("웨이팅 김. 오픈런 추천");
  });

  it("범위 밖 별점 수정은 거부된다", async () => {
    await expect(
      updatePlaceDetails(crypto.randomUUID(), { rating: 0, comment: "" }),
    ).rejects.toThrow(/별점/);
  });

  it("핀을 삭제하면 조회되지 않는다", async () => {
    const place = await addPlace({
      userId: author.id,
      name: "지울 집",
      address: "",
      lat: 37.5,
      lng: 127.0,
      rating: 1,
    });

    await deletePlace(place.id);
    expect(await getPlaceById(place.id)).toBeNull();
  });
});
