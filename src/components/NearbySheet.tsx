"use client";

import { useEffect, useState } from "react";
import StarRatingInput from "./StarRatingInput";
import type { NearbyCandidate } from "@/lib/place-search";
import { addPlace, type Place } from "@/lib/places";
import { isValidRating } from "@/lib/rating";
import type { User } from "@/lib/users";

type Props = {
  user: User;
  /** 지도에서 탭한 지점 */
  point: { lat: number; lng: number };
  onAdded: (place: Place) => void;
  onClose: () => void;
};

/** 탭한 지점 주변 가게 목록 → 선택 또는 직접 입력 → 별점 → 저장 (slice 6) */
export default function NearbySheet({ user, point, onAdded, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<NearbyCandidate[]>([]);
  const [pointAddress, setPointAddress] = useState("");
  const [selected, setSelected] = useState<NearbyCandidate | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/nearby-places?lat=${point.lat}&lng=${point.lng}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setCandidates(data.candidates);
        setPointAddress(data.address ?? "");
      })
      .catch(() => {
        if (!cancelled) setError("주변 검색에 실패했어요. 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [point.lat, point.lng]);

  async function save(input: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) {
    if (!isValidRating(rating)) return;
    setSaving(true);
    setError(null);
    try {
      const place = await addPlace({ userId: user.id, rating, ...input });
      onAdded(place);
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  function handleManualSave() {
    const name = manualName.trim();
    if (name.length === 0) {
      setError("가게 이름을 입력해 주세요.");
      return;
    }
    save({ name: name.slice(0, 100), address: pointAddress, ...point });
  }

  const showList = !selected && !manualMode;

  return (
    <div
      data-testid="nearby-sheet"
      className="absolute inset-x-0 bottom-0 z-20 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">이 위치 주변 가게</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      {pointAddress && (
        <p className="mb-2 text-xs text-gray-400">{pointAddress} 근처</p>
      )}

      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading && <p className="py-6 text-center text-gray-400">주변을 찾는 중…</p>}

      {showList && !loading && (
        <>
          <ul className="divide-y divide-gray-100">
            {candidates.length === 0 && (
              <li className="py-3 text-sm text-gray-500">
                근처(300m)에서 찾은 가게가 없어요
              </li>
            )}
            {candidates.map((c) => (
              <li key={c.kakaoId}>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="w-full py-3 text-left hover:bg-gray-50"
                >
                  <span className="font-semibold">{c.name}</span>
                  {c.category && (
                    <span className="ml-2 text-xs text-gray-400">{c.category}</span>
                  )}
                  <span className="ml-2 text-xs text-blue-500">{c.distanceM}m</span>
                  <span className="block text-sm text-gray-500">{c.address}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
          >
            찾는 가게가 없어요? 직접 입력
          </button>
        </>
      )}

      {selected && (
        <div className="space-y-4">
          <div>
            <p className="font-semibold">{selected.name}</p>
            <p className="text-sm text-gray-500">{selected.address}</p>
          </div>
          <StarRatingInput value={rating} onChange={setRating} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setRating(0);
              }}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 font-semibold text-gray-600"
            >
              다시 선택
            </button>
            <button
              type="button"
              onClick={() =>
                save({
                  name: selected.name,
                  address: selected.address,
                  lat: selected.lat,
                  lng: selected.lng,
                })
              }
              disabled={!isValidRating(rating) || saving}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-40"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}

      {manualMode && (
        <div className="space-y-4">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="가게 이름"
            aria-label="가게 이름"
            autoFocus
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <StarRatingInput value={rating} onChange={setRating} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setManualMode(false);
                setRating(0);
              }}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 font-semibold text-gray-600"
            >
              뒤로
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              disabled={!isValidRating(rating) || saving}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-40"
            >
              {saving ? "저장 중…" : "이 위치에 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
