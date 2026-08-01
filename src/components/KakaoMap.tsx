"use client";

import { useEffect, useRef, useState } from "react";
import { buildKakaoSdkUrl, DEFAULT_CENTER, DEFAULT_LEVEL } from "@/lib/kakao";
import type { KakaoMapInstance } from "@/types/kakao";

const SCRIPT_ID = "kakao-maps-sdk";

type Props = {
  /** 지도 생성 완료 시 호출 (이후 슬라이스에서 핀 얹을 때 사용) */
  onMapReady?: (map: unknown) => void;
};

export default function KakaoMap({ onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function createMap() {
      if (cancelled || !containerRef.current || !window.kakao) return;
      // StrictMode 이중 실행 가드: kakao.maps.load 콜백이 동기 실행되면
      // cancelled 플래그만으로는 지도가 2개 생겨 오버레이가 중복된다
      if (mapRef.current) {
        onMapReady?.(mapRef.current);
        return;
      }
      const { maps } = window.kakao;
      const map = new maps.Map(containerRef.current, {
        center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: DEFAULT_LEVEL,
      });
      mapRef.current = map;
      onMapReady?.(map);
    }

    try {
      const existing = document.getElementById(SCRIPT_ID);
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(createMap);
      } else if (existing) {
        existing.addEventListener("load", () =>
          window.kakao?.maps.load(createMap),
        );
      } else {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = buildKakaoSdkUrl(
          process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "",
        );
        script.onload = () => window.kakao?.maps.load(createMap);
        script.onerror = () => {
          if (!cancelled)
            setError("지도를 불러오지 못했어요. 네트워크를 확인해 주세요.");
        };
        document.head.appendChild(script);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "지도를 불러오지 못했어요.");
    }

    return () => {
      cancelled = true;
    };
    // onMapReady는 페이지 수명 동안 동일한 참조를 기대
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p role="alert" className="text-red-600">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="kakao-map"
      className="h-full w-full"
    />
  );
}
