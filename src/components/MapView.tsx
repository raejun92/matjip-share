"use client";

import KakaoMap from "./KakaoMap";
import type { User } from "@/lib/users";

type Props = {
  user: User;
};

/** 지도 메인 화면: 전체 화면 카카오맵 + 내 이름/색상 배지 (PRD §7 화면 2) */
export default function MapView({ user }: Props) {
  return (
    <main className="relative h-dvh w-full">
      <KakaoMap />
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
    </main>
  );
}
