// 카카오맵 SDK 전역 타입 (사용하는 부분만 선언)
declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number },
        ) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
      };
    };
  }
}

export {};
