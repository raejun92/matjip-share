"use client";

import { useState } from "react";
import StarRatingInput from "./StarRatingInput";
import type { PlaceCandidate } from "@/lib/place-search";
import { addPlace, type Place } from "@/lib/places";
import { isValidRating } from "@/lib/rating";
import type { User } from "@/lib/users";

type Props = {
  user: User;
  onAdded: (place: Place) => void;
  onClose: () => void;
};

/** 맛집 추가 시트: 검색 → 선택 → 별점 → 저장 (PRD §6.4) */
export default function AddPlaceSheet({ user, onAdded, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`/api/search-places?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCandidates(data.candidates);
    } catch {
      setError("검색에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setCandidates(null);
    } finally {
      setSearching(false);
    }
  }

  async function handleSave() {
    if (!selected || !isValidRating(rating)) return;
    setSaving(true);
    setError(null);
    try {
      const place = await addPlace({
        userId: user.id,
        name: selected.name,
        address: selected.address,
        lat: selected.lat,
        lng: selected.lng,
        rating,
      });
      onAdded(place);
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="add-place-sheet"
      className="absolute inset-x-0 bottom-0 z-20 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">맛집 추가</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="가게 이름으로 검색"
          aria-label="가게 검색"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {searching ? "검색 중…" : "검색"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!selected && candidates && (
        <ul className="mt-3 divide-y divide-gray-100">
          {candidates.length === 0 && (
            <li className="py-3 text-sm text-gray-500">검색 결과가 없어요</li>
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
                  <span className="ml-2 text-xs text-gray-400">
                    {c.category}
                  </span>
                )}
                <span className="block text-sm text-gray-500">{c.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-4 space-y-4">
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
              onClick={handleSave}
              disabled={!isValidRating(rating) || saving}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-40"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
