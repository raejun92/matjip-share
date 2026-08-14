"use client";

import { useState } from "react";
import { SheetDragHandle, useSheetDrag } from "./SheetDragHandle";
import { sortPlaces, type PlaceSort } from "@/lib/place-list";
import { RATING_MAX } from "@/lib/rating";
import type { Place } from "@/lib/places";

type Props = {
  places: Place[];
  onPick: (place: Place) => void;
  onClose: () => void;
};

/** 맛집 목록 시트 (slice 13): 정렬 토글 + 행 탭 → 지도 이동 */
export default function PlaceListSheet({ places, onPick, onClose }: Props) {
  const [sort, setSort] = useState<PlaceSort>("latest");
  const { height, handleProps } = useSheetDrag(onClose);
  const sorted = sortPlaces(places, sort);

  return (
    <div
      data-testid="place-list-sheet"
      style={{ height }}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <SheetDragHandle {...handleProps} />
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-bold">맛집 목록</h2>
        <div className="flex items-center gap-1">
          <div className="mr-1 flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSort("latest")}
              aria-pressed={sort === "latest"}
              className={`rounded-md px-2.5 py-1 ${
                sort === "latest" ? "bg-white shadow" : "text-gray-500"
              }`}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => setSort("rating")}
              aria-pressed={sort === "rating"}
              className={`rounded-md px-2.5 py-1 ${
                sort === "rating" ? "bg-white shadow" : "text-gray-500"
              }`}
            >
              별점순
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            아직 저장된 맛집이 없어요
          </p>
        )}
        <ul className="divide-y divide-gray-100">
          {sorted.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-2.5 py-3 text-left hover:bg-gray-50"
              >
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: p.author.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-gray-400">
                    {p.address}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-yellow-500">
                  {"★".repeat(p.rating)}
                  <span className="text-gray-200">
                    {"★".repeat(RATING_MAX - p.rating)}
                  </span>
                </span>
                <span className="w-14 shrink-0 truncate text-right text-xs text-gray-500">
                  {p.author.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
