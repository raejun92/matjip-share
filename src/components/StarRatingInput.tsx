"use client";

import { RATING_MIN, RATING_MAX } from "@/lib/rating";

type Props = {
  value: number;
  onChange: (rating: number) => void;
  /** 접근성 라벨 (E2E에서도 사용) — 기본: "별점 N점" */
  ariaLabel?: (n: number) => string;
  size?: "lg" | "md";
};

export default function StarRatingInput({
  value,
  onChange,
  ariaLabel = (n) => `별점 ${n}점`,
  size = "lg",
}: Props) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="별점">
      {Array.from(
        { length: RATING_MAX - RATING_MIN + 1 },
        (_, i) => i + RATING_MIN,
      ).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={ariaLabel(n)}
          onClick={() => onChange(n)}
          className={`leading-none ${size === "lg" ? "text-3xl" : "text-2xl"} ${
            n <= value ? "text-yellow-400" : "text-gray-300"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
