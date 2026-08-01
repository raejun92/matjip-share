// 카카오맵 SDK 로드 (PRD §8: 카카오맵 JavaScript SDK)

/** 서울시청 — 핀 기반 화면 맞춤 전까지의 초기 중심 (spec 규칙 2) */
export const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
export const DEFAULT_LEVEL = 5;

export function buildKakaoSdkUrl(appKey: string): string {
  if (!appKey) {
    throw new Error(
      "카카오 JavaScript 키가 없습니다. NEXT_PUBLIC_KAKAO_JS_KEY 환경변수를 확인하세요.",
    );
  }
  // autoload=false: 스크립트 로드 후 kakao.maps.load()로 수동 초기화
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
}
