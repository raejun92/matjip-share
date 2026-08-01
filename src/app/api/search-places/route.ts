import { NextRequest, NextResponse } from "next/server";
import { mapKakaoDocuments } from "@/lib/place-search";

// 카카오 로컬 키워드 검색 프록시.
// REST 키는 서버에만 두고 브라우저에 노출하지 않는다 (spec 규칙 1).
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ candidates: [] });
  }

  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) {
    return NextResponse.json(
      { error: "서버에 KAKAO_REST_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "10");

  const upstream = await fetch(url, {
    headers: { Authorization: `KakaoAK ${restKey}` },
  });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  const data = await upstream.json();
  return NextResponse.json({
    candidates: mapKakaoDocuments(data.documents ?? []),
  });
}
