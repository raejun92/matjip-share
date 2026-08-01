"use client";

import { useEffect, useRef } from "react";
import type { Place } from "@/lib/places";
import type { KakaoOverlay } from "@/types/kakao";

type Props = {
  map: unknown | null;
  places: Place[];
  onSelect: (place: Place) => void;
};

/** 작성자 색으로 칠한 물방울 핀 SVG */
function pinSvg(color: string): string {
  return `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 10.7 13.1 22.2 14.6 23.4a2.2 2.2 0 0 0 2.8 0C18.9 38.2 32 26.7 32 16 32 7.2 24.8 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="15" r="5.5" fill="white"/>
</svg>`;
}

/** places를 카카오맵 CustomOverlay로 그린다 (지도 경계 — React 밖 명령형 관리) */
export default function PlacePins({ map, places, onSelect }: Props) {
  const overlaysRef = useRef<KakaoOverlay[]>([]);

  useEffect(() => {
    if (!map || !window.kakao) return;
    const { maps } = window.kakao;

    // MVP 규모(수십 개)라 전체를 지우고 다시 그린다
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = places.map((place) => {
      const content = document.createElement("button");
      content.type = "button";
      content.dataset.testid = "place-pin";
      content.dataset.placeName = place.name;
      content.title = `${place.name} (${place.author.name})`;
      content.style.cssText =
        "background:none;border:none;padding:0;cursor:pointer;line-height:0;";
      content.innerHTML = pinSvg(place.author.color);
      content.addEventListener("click", () => onSelect(place));

      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(place.lat, place.lng),
        content,
        yAnchor: 1,
      });
      overlay.setMap(map);
      return overlay;
    });

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, places, onSelect]);

  return null;
}
