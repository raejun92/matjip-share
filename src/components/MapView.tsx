"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KakaoMap from "./KakaoMap";
import PlacePins from "./PlacePins";
import AddPlaceSheet from "./AddPlaceSheet";
import { getPlaces, getPlaceById, type Place } from "@/lib/places";
import { upsertPlace } from "@/lib/place-list";
import { subscribeToPlaces } from "@/lib/realtime";
import type { User } from "@/lib/users";
import type { KakaoMapInstance } from "@/types/kakao";

type Props = {
  user: User;
};

/** 지도 메인 화면: 카카오맵 + 색상 핀 + 내 배지 + 맛집 추가 (PRD §7) */
export default function MapView({ user }: Props) {
  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getPlaces()
      .then(setPlaces)
      .catch(() => setLoadError("저장된 맛집을 불러오지 못했어요."));

    // 친구가 추가한 핀 실시간 반영 (PRD §6.5).
    // 페이로드엔 작성자 join이 없으므로 id로 재조회. 내 핀은 id dedupe로 중복 방지.
    return subscribeToPlaces({
      onInsert: (placeId) => {
        getPlaceById(placeId)
          .then((place) => {
            if (place) setPlaces((prev) => upsertPlace(prev, place));
          })
          .catch(() => {
            // 재조회 실패는 치명적이지 않음 — 다음 새로고침 때 반영된다
          });
      },
    });
  }, []);

  const handleMapReady = useCallback(
    (m: unknown) => setMap(m as KakaoMapInstance),
    [],
  );
  const handleSelect = useCallback((place: Place) => setSelected(place), []);

  // 지도 로드 전에 저장이 끝나면 이동이 유실된다 (느린 회선에서 재현) — 준비되면 실행
  const pendingPanRef = useRef<Place | null>(null);

  function panTo(place: Place) {
    if (map && window.kakao) {
      map.panTo(new window.kakao.maps.LatLng(place.lat, place.lng));
    } else {
      pendingPanRef.current = place;
    }
  }

  useEffect(() => {
    if (map && window.kakao && pendingPanRef.current) {
      const place = pendingPanRef.current;
      pendingPanRef.current = null;
      map.panTo(new window.kakao.maps.LatLng(place.lat, place.lng));
    }
  }, [map]);

  function handleAdded(place: Place) {
    setPlaces((prev) => [...prev, place]);
    setSheetOpen(false);
    setSelected(place);
    panTo(place);
  }

  return (
    <main className="relative h-dvh w-full">
      <KakaoMap onMapReady={handleMapReady} />
      <PlacePins map={map} places={places} onSelect={handleSelect} />

      {/* 내 배지 */}
      <div
        data-testid="my-badge"
        className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-2 pr-4 shadow-md"
      >
        <span
          data-testid="my-color"
          className="inline-block h-5 w-5 rounded-full"
          style={{ backgroundColor: user.color }}
        />
        <span className="text-sm font-semibold">{user.name}</span>
      </div>

      {loadError && (
        <p
          role="alert"
          className="absolute inset-x-0 top-16 z-10 mx-auto w-fit rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 shadow"
        >
          {loadError}
        </p>
      )}

      {/* 맛집 추가 버튼 */}
      {!sheetOpen && (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setSheetOpen(true);
          }}
          className="absolute bottom-6 right-4 z-10 rounded-full bg-blue-600 px-5 py-3.5 text-lg font-bold text-white shadow-lg hover:bg-blue-700"
        >
          + 맛집 추가
        </button>
      )}

      {sheetOpen && (
        <AddPlaceSheet
          user={user}
          onAdded={handleAdded}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {/* 핀 정보 카드 */}
      {selected && !sheetOpen && (
        <div
          data-testid="place-info"
          className="absolute inset-x-4 bottom-6 z-10 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{selected.name}</p>
              <p className="text-sm text-yellow-500">
                {"★".repeat(selected.rating)}
                <span className="text-gray-300">
                  {"★".repeat(5 - selected.rating)}
                </span>
                <span className="ml-1 text-xs text-gray-500">
                  {selected.rating}점
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="정보 닫기"
              className="rounded-full px-2 text-gray-400 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          {selected.address && (
            <p className="mt-1 text-sm text-gray-500">{selected.address}</p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: selected.author.color }}
            />
            {selected.author.name}
          </p>
        </div>
      )}
    </main>
  );
}
