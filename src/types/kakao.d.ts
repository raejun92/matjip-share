// 카카오맵 SDK 전역 타입 (사용하는 부분만 선언)

/** 지도 인스턴스 중 우리가 쓰는 메서드 */
interface KakaoMapInstance {
  panTo(latlng: unknown): void;
  setBounds(bounds: unknown): void;
  getProjection(): {
    containerPointFromCoords(latlng: unknown): { x: number; y: number };
  };
}

interface KakaoLatLngBounds {
  extend(latlng: unknown): void;
}

interface KakaoMouseEvent {
  latLng: { getLat(): number; getLng(): number };
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
          clickable?: boolean;
        }) => KakaoOverlay;
        LatLngBounds: new () => KakaoLatLngBounds;
        event: {
          addListener(
            target: unknown,
            type: string,
            handler: (e: KakaoMouseEvent) => void,
          ): void;
          removeListener(
            target: unknown,
            type: string,
            handler: (e: KakaoMouseEvent) => void,
          ): void;
        };
      };
    };
  }
}

export type { KakaoMapInstance, KakaoOverlay, KakaoMouseEvent };
