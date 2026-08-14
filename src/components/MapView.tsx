"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KakaoMap from "./KakaoMap";
import PlacePins from "./PlacePins";
import AddPlaceSheet from "./AddPlaceSheet";
import NearbySheet from "./NearbySheet";
import PlaceInfoCard from "./PlaceInfoCard";
import { getPlaces, getPlaceById, type Place } from "@/lib/places";
import { upsertPlace, removePlace, uniqueAuthors } from "@/lib/place-list";
import {
  pickDirectSuggestion,
  type NearbyCandidate,
} from "@/lib/place-search";
import { findNearestWithin, PIN_HIT_RADIUS_PX } from "@/lib/hit-test";
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
  // 내 위치 버튼 상태 (slice 8)
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  // 최초 로드 결과 (fit bounds 기준 — 실시간 추가로는 화면을 안 움직임)
  const initialPlacesRef = useRef<Place[] | null>(null);
  // 친구 필터 (slice 10): null = 전체 보기
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  // 탭 핸들러(effect 클로저)에서 최신 표시 핀 목록 참조용 (slice 11)
  const visiblePlacesRef = useRef<Place[]>([]);
  // 탭 핸들러에서 최신 임시 마커 위치 참조용 (slice 12)
  const pickedPointRef = useRef<{ lat: number; lng: number } | null>(null);

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
      // 탭 지점이 화면상 핀 근처면 추가 흐름 대신 그 핀을 연다 (slice 11).
      // 핀의 실질 탭 영역을 키워 "핀 클릭 = 생성"으로 오인되는 문제 해결.
      const { maps } = window.kakao!;
      const projection = map.getProjection();
      const clickPt = projection.containerPointFromCoords(e.latLng);

      // 임시(회색) 마커 근처 재탭 → 마커 해제 (slice 12, 최우선 분기)
      const picked = pickedPointRef.current;
      if (picked) {
        const pickedPt = projection.containerPointFromCoords(
          new maps.LatLng(picked.lat, picked.lng),
        );
        // 마커 그림(높이 35, 앵커 하단)의 시각적 중심으로 보정
        const markerHit = findNearestWithin(
          [{ x: pickedPt.x, y: pickedPt.y - 17 }],
          clickPt,
          PIN_HIT_RADIUS_PX,
        );
        if (markerHit) {
          tapSeqRef.current++; // 진행 중인 주변 조회 응답 무시
          setPickedPoint(null);
          setNearbyData(null);
          setDirectCandidate(null);
          setNearbyOpen(false);
          return;
        }
      }

      const pinPoints = visiblePlacesRef.current.map((place) => {
        const pt = projection.containerPointFromCoords(
          new maps.LatLng(place.lat, place.lng),
        );
        // 핀 그림(높이 40, 앵커 하단)의 시각적 중심으로 보정
        return { x: pt.x, y: pt.y - 20, place };
      });
      const hit = findNearestWithin(pinPoints, clickPt, PIN_HIT_RADIUS_PX);
      if (hit) {
        setSelected(hit.place);
        setPickedPoint(null);
        setNearbyOpen(false);
        setDirectCandidate(null);
        setSheetOpen(false);
        return;
      }

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

  /** 주어진 핀들이 모두 보이게 화면 맞춤 */
  function fitTo(list: Place[]) {
    if (!map || !window.kakao || list.length === 0) return;
    const { maps } = window.kakao;
    const bounds = new maps.LatLngBounds();
    for (const place of list) {
      bounds.extend(new maps.LatLng(place.lat, place.lng));
    }
    map.setBounds(bounds);
  }

  // 친구 필터 (slice 10)
  const authors = uniqueAuthors(places);
  const visiblePlaces = filterUserId
    ? places.filter((p) => p.userId === filterUserId)
    : places;
  visiblePlacesRef.current = visiblePlaces;
  pickedPointRef.current = pickedPoint;

  function toggleFilter(userId: string) {
    const next = filterUserId === userId ? null : userId;
    setFilterUserId(next);
    setSelected(null);
    fitTo(next ? places.filter((p) => p.userId === next) : places);
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

  // 내 위치로 이동 (slice 8) — GPS는 버튼을 눌렀을 때만 사용
  function handleLocate() {
    if (!navigator.geolocation) {
      setLocateError("이 브라우저는 위치를 지원하지 않아요.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        panToCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setLocateError("위치를 가져오지 못했어요. 브라우저 위치 권한을 확인해 주세요.");
        setTimeout(() => setLocateError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

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
      <PlacePins map={map} places={visiblePlaces} onSelect={handleSelect} />

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

      {/* 친구 필터 칩 (slice 10) */}
      {authors.length > 0 && (
        <div
          data-testid="filter-chips"
          className="absolute inset-x-3 top-14 z-10 flex gap-1.5 overflow-x-auto pb-1"
        >
          {authors.map((a) => {
            const active = filterUserId === a.userId;
            return (
              <button
                key={a.userId}
                type="button"
                onClick={() => toggleFilter(a.userId)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-xs font-semibold shadow-md ${
                  active
                    ? "bg-gray-800 text-white"
                    : "bg-white/95 text-gray-700"
                }`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                {a.name}
              </button>
            );
          })}
        </div>
      )}

      {loadError && (
        <p
          role="alert"
          className="absolute inset-x-0 top-24 z-10 mx-auto w-fit rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 shadow"
        >
          {loadError}
        </p>
      )}

      {/* 내 위치 버튼 (slice 8) */}
      {!sheetOpen && !nearbyOpen && (
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          aria-label="내 위치로 이동"
          className="absolute bottom-24 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-lg disabled:opacity-50"
        >
          {locating ? "…" : "⌖"}
        </button>
      )}

      {locateError && (
        <p
          role="alert"
          className="absolute inset-x-0 top-16 z-10 mx-auto w-fit rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 shadow"
        >
          {locateError}
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
