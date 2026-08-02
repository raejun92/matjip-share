import { NextRequest, NextResponse } from "next/server";
import { mergeNearby, type KakaoNearbyDocument } from "@/lib/place-search";

const RADIUS_M = 300;
const CATEGORY_CODES = ["FD6", "CE7"]; // 음식점, 카페

// 탭한 지점 주변 음식점·카페 검색 + 좌표→주소 변환 (slice 6).
// REST 키는 서버에만 둔다.
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat/lng가 필요합니다." },
      { status: 400 },
    );
  }

  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) {
    return NextResponse.json(
      { error: "서버에 KAKAO_REST_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }
  const headers = { Authorization: `KakaoAK ${restKey}` };

  const categoryUrl = (code: string) => {
    const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
    url.searchParams.set("category_group_code", code);
    url.searchParams.set("x", String(lng));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("radius", String(RADIUS_M));
    url.searchParams.set("sort", "distance");
    return url;
  };
  const addressUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
  addressUrl.searchParams.set("x", String(lng));
  addressUrl.searchParams.set("y", String(lat));

  const [foodRes, cafeRes, addrRes] = await Promise.all([
    fetch(categoryUrl(CATEGORY_CODES[0]), { headers }),
    fetch(categoryUrl(CATEGORY_CODES[1]), { headers }),
    fetch(addressUrl, { headers }),
  ]);
  if (!foodRes.ok || !cafeRes.ok) {
    return NextResponse.json(
      { error: "주변 검색에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  const [food, cafe] = await Promise.all([foodRes.json(), cafeRes.json()]);
  const candidates = mergeNearby([
    (food.documents ?? []) as KakaoNearbyDocument[],
    (cafe.documents ?? []) as KakaoNearbyDocument[],
  ]);

  // 직접 입력용 주소 (실패해도 치명적이지 않음 — 빈 문자열)
  let address = "";
  if (addrRes.ok) {
    const addr = await addrRes.json();
    const doc = addr.documents?.[0];
    address = doc?.road_address?.address_name || doc?.address?.address_name || "";
  }

  return NextResponse.json({ candidates, address });
}
