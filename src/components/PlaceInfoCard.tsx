"use client";

import { useState } from "react";
import StarRatingInput from "./StarRatingInput";
import {
  addPlace,
  updatePlaceDetails,
  deletePlace,
  type Place,
} from "@/lib/places";
import { RATING_MAX, isValidRating } from "@/lib/rating";
import type { User } from "@/lib/users";

type Props = {
  /** 같은 가게를 저장한 전원의 항목 (slice 22) */
  entries: Place[];
  currentUser: User;
  onClose: () => void;
  onUpdated: (place: Place) => void;
  onDeleted: (placeId: string) => void;
  /** "나도 별점 남기기"로 새 항목 추가 (slice 22) */
  onAdded: (place: Place) => void;
};

type Mode = "view" | "edit" | "confirm-delete" | "join";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-yellow-500">
      {"★".repeat(rating)}
      <span className="text-gray-300">{"★".repeat(RATING_MAX - rating)}</span>
      <span className="ml-1 text-xs text-gray-500">{rating}점</span>
    </span>
  );
}

/** 핀 정보 카드: 가게 1곳 + 저장한 전원의 별점·한줄평 (slice 22) */
export default function PlaceInfoCard({
  entries,
  currentUser,
  onClose,
  onUpdated,
  onDeleted,
  onAdded,
}: Props) {
  const place = entries[0];
  const myEntry = entries.find((e) => e.userId === currentUser.id) ?? null;
  const [mode, setMode] = useState<Mode>("view");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveEdit() {
    if (!myEntry || !isValidRating(rating)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updatePlaceDetails(myEntry.id, { rating, comment });
      onUpdated(updated);
      setMode("view");
    } catch {
      setError("수정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!myEntry) return;
    setBusy(true);
    setError(null);
    try {
      await deletePlace(myEntry.id);
      onDeleted(myEntry.id);
    } catch {
      setError("삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!isValidRating(rating)) return;
    setBusy(true);
    setError(null);
    try {
      const added = await addPlace({
        userId: currentUser.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        rating,
        comment,
      });
      onAdded(added);
      setMode("view");
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const editing = mode === "edit" || mode === "join";

  return (
    <div
      data-testid="place-info"
      className="absolute inset-x-4 bottom-6 z-10 mx-auto max-h-[55dvh] max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{place.name}</p>
          {place.address && (
            <p className="text-sm text-gray-500">{place.address}</p>
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

      {/* 저장한 전원의 항목 */}
      <ul className="mt-3 space-y-2.5">
        {entries.map((entry) => {
          const mine = entry.userId === currentUser.id;
          return (
            <li key={entry.id} data-testid="place-entry">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.author.color }}
                />
                <span className="text-sm font-semibold">
                  {entry.author.name}
                </span>
                {mine && editing && mode === "edit" ? null : (
                  <Stars rating={entry.rating} />
                )}
              </div>
              {mine && mode === "edit" ? (
                <div className="mt-1.5 space-y-2 rounded-lg bg-gray-50 p-2.5">
                  <StarRatingInput value={rating} onChange={setRating} size="md" ariaLabel={(n) => `별점 ${n}점으로 변경`} />
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="한줄평 (선택)"
                    aria-label="한줄평 수정"
                    maxLength={200}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMode("view")}
                      className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-semibold text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={busy}
                      className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "저장 중…" : "저장"}
                    </button>
                  </div>
                </div>
              ) : (
                entry.comment && (
                  <p
                    data-testid="place-comment"
                    className="mt-1 rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
                  >
                    💬 {entry.comment}
                  </p>
                )
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 내 항목 액션 */}
      {myEntry && mode === "view" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRating(myEntry.rating);
              setComment(myEntry.comment);
              setMode("edit");
            }}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-600"
          >
            수정
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

      {/* 내 항목이 없으면: 나도 별점 남기기 (slice 22) */}
      {!myEntry && mode === "view" && (
        <button
          type="button"
          onClick={() => {
            setRating(0);
            setComment("");
            setMode("join");
          }}
          className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white"
        >
          ⭐ 나도 별점 남기기
        </button>
      )}

      {mode === "join" && (
        <div className="mt-3 space-y-2 rounded-lg bg-blue-50 p-2.5">
          <StarRatingInput value={rating} onChange={setRating} size="md" />
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="한줄평 (선택)"
            aria-label="내 한줄평"
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode("view")}
              className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-semibold text-gray-600"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleJoin}
              disabled={!isValidRating(rating) || busy}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
