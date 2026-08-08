"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KakaoMap from "./KakaoMap";
import PlacePins from "./PlacePins";
import AddPlaceSheet from "./AddPlaceSheet";
import NearbySheet from "./NearbySheet";
import PlaceInfoCard from "./PlaceInfoCard";
import { getPlaces, getPlaceById, type Place } from "@/lib/places";
import { upsertPlace, removePlace } from "@/lib/place-list";
import {
  pickDirectSuggestion,
  type NearbyCandidate,
} from "@/lib/place-search";
import { subscribeToPlaces } from "@/lib/realtime";
import type { User } from "@/lib/users";
import type { KakaoMapInstance } from "@/types/kakao";

type NearbyData = { candidates: NearbyCandidate[]; address: string };

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
  // 위치로 추가 (slice 6·7): 탭 지점, 미리 조회한 주변 데이터, 시트 상태
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyData | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  // 가게 라벨 탭 판정 시 별점 화면으로 바로 진입할 후보
  const [directCandidate, setDirectCandidate] = useState<NearbyCandidate | null>(null);
  // 연속 탭 시 이전 응답이 덮어쓰지 않게 시퀀스 가드
  const tapSeqRef = useRef(0);
  // 최초 로드 결과 (fit bounds 기준 — 실시간 추가로는 화면을 안 움직임)
  const initialPlacesRef = useRef<Place[] | null>(null);

  useEffect(() => {
    getPlaces()
      .then((list) => {
        setPlaces(list);
        initialPlacesRef.current = list;
      })
      .catch(() => setLoadError("저장된 맛집을 불러오지 못했어요."));

    // 친구의 추가/수정/삭제 실시간 반영 (PRD §6.5, 슬라이스 5).
    // 페이로드엔 작성자 join이 없으므로 id로 재조회. 내 작업은 id dedupe로 중복 방지.
    const refetchAndUpsert = (placeId: string) => {
      getPlaceById(placeId)
        .then((place) => {
          if (place) {
            setPlaces((prev) => upsertPlace(prev, place));
            // 열려 있는 정보 카드도 갱신 (친구가 별점을 고치는 중일 수 있다)
            setSelected((prev) => (prev?.id === place.id ? place : prev));
          }
        })
        .catch(() => {
          // 재조회 실패는 치명적이지 않음 — 다음 새로고침 때 반영된다
        });
    };
    return subscribeToPlaces({
      onInsert: refetchAndUpsert,
      onUpdate: refetchAndUpsert,
      onDelete: (placeId) => {
        setPlaces((prev) => removePlace(prev, placeId));
        setSelected((prev) => (prev?.id === placeId ? null : prev));
      },
    });
  }, []);

  const handleMapReady = useCallback(
    (m: unknown) => setMap(m as KakaoMapInstance),
    [],
  );
  const handleSelect = useCallback((place: Place) => setSelected(place), []);

  // 접속 시 저장된 핀이 전부 화면에 들어오게 1회 범위 맞춤.
  // 없으면 기본 중심(서울시청) 밖 핀이 컬링돼 "빈 지도"로 보인다.
  // 최초 로드 결과에만 적용 — 이후 실시간 친구 핀이 와도 화면을 끌고 가지 않는다 (slice 7).
  const didFitBoundsRef = useRef(false);
  useEffect(() => {
    const initial = initialPlacesRef.current;
    if (didFitBoundsRef.current || !map || !window.kakao || !initial) return;
    didFitBoundsRef.current = true;
    if (initial.length === 0) return;
    const { maps } = window.kakao;
    const bounds = new maps.LatLngBounds();
    for (const place of initial) {
      bounds.extend(new maps.LatLng(place.lat, place.lng));
    }
    map.setBounds(bounds);
  }, [map, places]);

  // 지도 탭 → 지점 선택 + 즉시 주변 조회 (slice 6·7). 열려 있던 카드/시트는 닫는다.
  useEffect(() => {
    if (!map || !window.kakao) return;
    const { event } = window.kakao.maps;
    const handleClick = (e: { latLng: { getLat(): number; getLng(): number } }) => {
      const point = { lat: e.latLng.getLat(), lng: e.latLng.getLng() };
      const seq = ++tapSeqRef.current;
      setPickedPoint(point);
      setNearbyData(null);
      setDirectCandidate(null);
      setNearbyOpen(false);
      setSelected(null);
      setSheetOpen(false);

      fetch(`/api/nearby-places?lat=${point.lat}&lng=${point.lng}`)
        .then((res) => (res.ok ? res.json() : { candidates: [], address: "" }))
        .catch(() => ({ candidates: [], address: "" }))
        .then((data: NearbyData) => {
          if (seq !== tapSeqRef.current) return; // 더 최근 탭이 있음
          setNearbyData(data);
          // 가게 라벨을 노린 탭이면 바로 추가 제안 (spec 규칙 2)
          setDirectCandidate(pickDirectSuggestion(data.candidates));
        });
    };
    event.addListener(map, "click", handleClick);
    return () => event.removeListener(map, "click", handleClick);
  }, [map]);

  // 탭 지점 임시 마커 (회색)
  const pickedOverlayRef = useRef<{ setMap(m: unknown | null): void } | null>(null);
  useEffect(() => {
    pickedOverlayRef.current?.setMap(null);
    pickedOverlayRef.current = null;
    if (!map || !window.kakao || !pickedPoint) return;
    const { maps } = window.kakao;
    const content = document.createElement("div");
    content.dataset.testid = "picked-point";
    content.style.cssText = "line-height:0;pointer-events:none;";
    content.innerHTML = `
<svg width="28" height="35" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 10.7 13.1 22.2 14.6 23.4a2.2 2.2 0 0 0 2.8 0C18.9 38.2 32 26.7 32 16 32 7.2 24.8 0 16 0z"
        fill="#6B7280" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="15" r="5.5" fill="white"/>
</svg>`;
    const overlay = new maps.CustomOverlay({
      position: new maps.LatLng(pickedPoint.lat, pickedPoint.lng),
      content,
      yAnchor: 1,
    });
    overlay.setMap(map);
    pickedOverlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
    };
  }, [map, pickedPoint]);

  // 지도 로드 전에 저장이 끝나면 이동이 유실된다 (느린 회선에서 재현) — 준비되면 실행
  const pendingPanRef = useRef<Place | null>(null);

  function panToCoords(lat: number, lng: number) {
    if (map && window.kakao) {
      map.panTo(new window.kakao.maps.LatLng(lat, lng));
    }
  }

  function panTo(place: Place) {
    if (map && window.kakao) {
      panToCoords(place.lat, place.lng);
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
    setNearbyOpen(false);
    setPickedPoint(null);
    setDirectCandidate(null);
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
          onPreview={panToCoords}
          onAdded={handleAdded}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {/* 탭 지점 popover (slice 6·7): 확인 중 → 가게 바로 추가 or 주변 찾기 */}
      {pickedPoint && !nearbyOpen && !sheetOpen && (
        <div className="absolute inset-x-4 bottom-6 z-10 flex justify-center">
          <div className="flex max-w-full items-center gap-1 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-lg">
            {nearbyData === null ? (
              <span className="text-sm text-gray-400">주변 확인 중…</span>
            ) : directCandidate ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    panToCoords(directCandidate.lat, directCandidate.lng);
                    setNearbyOpen(true);
                  }}
                  className="truncate text-sm font-semibold text-blue-600"
                >
                  📍 {directCandidate.name} 추가하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectCandidate(null);
                    setNearbyOpen(true);
                  }}
                  className="shrink-0 border-l border-gray-200 pl-2 text-sm text-gray-500"
                >
                  주변 더 보기
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setNearbyOpen(true)}
                className="text-sm font-semibold text-blue-600"
              >
                📍 이 위치 주변에서 찾기
              </button>
            )}
            <button
              type="button"
              onClick={() => setPickedPoint(null)}
              aria-label="지점 선택 취소"
              className="shrink-0 rounded-full px-2.5 py-1 text-gray-400 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {pickedPoint && nearbyOpen && nearbyData && (
        <NearbySheet
          user={user}
          point={pickedPoint}
          candidates={nearbyData.candidates}
          pointAddress={nearbyData.address}
          initialSelected={directCandidate}
          onPreview={panToCoords}
          onAdded={handleAdded}
          onClose={() => {
            setNearbyOpen(false);
            setPickedPoint(null);
            setDirectCandidate(null);
          }}
        />
      )}

      {/* 핀 정보 카드 (내 핀이면 수정/삭제 가능 — PRD §6.6) */}
      {selected && !sheetOpen && (
        <PlaceInfoCard
          key={`${selected.id}-${selected.rating}`}
          place={selected}
          isMine={selected.userId === user.id}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setPlaces((prev) => upsertPlace(prev, updated));
            setSelected(updated);
          }}
          onDeleted={(placeId) => {
            setPlaces((prev) => removePlace(prev, placeId));
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}
