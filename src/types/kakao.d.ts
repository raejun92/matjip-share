// 카카오맵 SDK 전역 타입 (사용하는 부분만 선언)

/** 지도 인스턴스 중 우리가 쓰는 메서드 */
interface KakaoMapInstance {
  panTo(latlng: unknown): void;
}

interface KakaoOverlay {
  setMap(map: unknown | null): void;
}

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number },
        ) => KakaoMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        CustomOverlay: new (options: {
          position: unknown;
          content: HTMLElement;
          yAnchor?: number;
        }) => KakaoOverlay;
      };
    };
  }
}

export type { KakaoMapInstance, KakaoOverlay };
