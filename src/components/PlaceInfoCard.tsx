"use client";

import { useState } from "react";
import StarRatingInput from "./StarRatingInput";
import {
  updatePlaceRating,
  deletePlace,
  type Place,
} from "@/lib/places";
import { RATING_MAX, isValidRating } from "@/lib/rating";

type Props = {
  place: Place;
  /** 내 핀일 때만 수정/삭제 노출 (PRD §6.6 — UI 레벨 권한) */
  isMine: boolean;
  onClose: () => void;
  onUpdated: (place: Place) => void;
  onDeleted: (placeId: string) => void;
};

type Mode = "view" | "edit" | "confirm-delete";

export default function PlaceInfoCard({
  place,
  isMine,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [rating, setRating] = useState(place.rating);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveRating() {
    if (!isValidRating(rating)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updatePlaceRating(place.id, rating);
      onUpdated(updated);
      setMode("view");
    } catch {
      setError("수정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deletePlace(place.id);
      onDeleted(place.id);
    } catch {
      setError("삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="place-info"
      className="absolute inset-x-4 bottom-6 z-10 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{place.name}</p>
          {mode === "edit" ? (
            <div className="mt-1">
              <StarRatingInput
                value={rating}
                onChange={setRating}
                size="md"
                ariaLabel={(n) => `별점 ${n}점으로 변경`}
              />
            </div>
          ) : (
            <p className="text-sm text-yellow-500">
              {"★".repeat(place.rating)}
              <span className="text-gray-300">
                {"★".repeat(RATING_MAX - place.rating)}
              </span>
              <span className="ml-1 text-xs text-gray-500">
                {place.rating}점
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="정보 닫기"
          className="rounded-full px-2 text-gray-400 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      {place.address && (
        <p className="mt-1 text-sm text-gray-500">{place.address}</p>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
        <span
          className="inline-block h-3.5 w-3.5 rounded-full"
          style={{ backgroundColor: place.author.color }}
        />
        {place.author.name}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {isMine && mode === "view" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRating(place.rating);
              setMode("edit");
            }}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-600"
          >
            별점 수정
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-delete")}
            className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600"
          >
            삭제
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSaveRating}
            disabled={busy}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      )}

      {mode === "confirm-delete" && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-red-600">
            정말 삭제할까요? 친구들 지도에서도 사라져요.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("view")}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-600"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
