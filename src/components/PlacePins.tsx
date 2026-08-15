"use client";

import { useEffect, useRef } from "react";
import type { Place } from "@/lib/places";
import type { PlaceGroup } from "@/lib/place-list";
import type { KakaoOverlay } from "@/types/kakao";

type Props = {
  map: unknown | null;
  /** 같은 가게끼리 병합된 그룹 (slice 22) */
  groups: PlaceGroup[];
  /** 가게 이름 칩 표시 여부 (광역 줌에선 겹침 방지로 숨김 — slice 21) */
  showLabels: boolean;
  onSelect: (place: Place) => void;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 작성자 색 물방울 핀. 2명 이상이면 원 안에 인원수 표시 (slice 22) */
function pinSvg(color: string, count: number): string {
  const center =
    count > 1
      ? `<circle cx="16" cy="15" r="7" fill="white"/>
         <text x="16" y="19" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}">${count}</text>`
      : `<circle cx="16" cy="15" r="5.5" fill="white"/>`;
  return `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 10.7 13.1 22.2 14.6 23.4a2.2 2.2 0 0 0 2.8 0C18.9 38.2 32 26.7 32 16 32 7.2 24.8 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
  ${center}
</svg>`;
}

/** 그룹을 카카오맵 CustomOverlay로 그린다 (지도 경계 — React 밖 명령형 관리) */
export default function PlacePins({ map, groups, showLabels, onSelect }: Props) {
  const overlaysRef = useRef<KakaoOverlay[]>([]);

  useEffect(() => {
    if (!map || !window.kakao) return;
    const { maps } = window.kakao;

    // MVP 규모(수십 개)라 전체를 지우고 다시 그린다
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = groups.map((group) => {
      const first = group.entries[0];
      const authors = group.entries.map((e) => e.author);
      const content = document.createElement("button");
      content.type = "button";
      content.dataset.testid = "place-pin";
      content.dataset.placeName = group.name;
      content.title = `${group.name} (${authors.map((a) => a.name).join(", ")})`;
      content.style.cssText =
        "background:none;border:none;padding:0;cursor:pointer;line-height:0;display:flex;flex-direction:column;align-items:center;";
      // 라벨 칩: 이름 + 저장한 사람들 색 점 (최대 3)
      const dots = authors
        .slice(0, 3)
        .map(
          (a) =>
            `<span style="display:inline-block;width:7px;height:7px;border-radius:9999px;background:${a.color};"></span>`,
        )
        .join("");
      const label = showLabels
        ? `<span style="display:flex;align-items:center;gap:3px;max-width:110px;
             background:rgba(255,255,255,0.95);border-radius:9999px;padding:2px 8px;margin-bottom:2px;
             font-size:11px;font-weight:700;color:#1f2937;line-height:1.3;
             box-shadow:0 1px 4px rgba(0,0,0,0.25);">
             <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(group.name)}</span>
             ${authors.length > 1 ? `<span style="display:inline-flex;gap:2px;flex-shrink:0;">${dots}</span>` : ""}
           </span>`
        : "";
      content.innerHTML = label + pinSvg(first.author.color, group.entries.length);
      content.addEventListener("click", (e) => {
        // 지도 click까지 버블되면 히트 테스트가 다른 핀으로 선택을 덮어쓸 수 있다
        e.stopPropagation();
        onSelect(first);
      });

      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(group.lat, group.lng),
        content,
        yAnchor: 1,
        // clickable: true를 쓰지 않는다 — 래퍼 영역의 지도 탭까지 삼켜
        // "아무 일도 안 일어나는" 데드존이 생긴다. 근접 탭은 지도 클릭의
        // 픽셀 히트 테스트(slice 11)가 일관되게 처리한다.
      });
      overlay.setMap(map);
      return overlay;
    });

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, groups, showLabels, onSelect]);

  return null;
}
