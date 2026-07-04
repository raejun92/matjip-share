"use client";

import { useEffect, useState } from "react";
import NameEntry from "@/components/NameEntry";
import { getUserById, type User } from "@/lib/users";
import { loadSessionUserId, clearSessionUserId } from "@/lib/session";

type Phase = "loading" | "name-entry" | "ready";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<User | null>(null);

  // 재접속: localStorage의 id로 사용자 복원. DB에 없으면 입력 화면으로 (spec 규칙 4)
  useEffect(() => {
    const savedId = loadSessionUserId();
    if (!savedId) {
      setPhase("name-entry");
      return;
    }
    getUserById(savedId)
      .then((found) => {
        if (found) {
          setUser(found);
          setPhase("ready");
        } else {
          clearSessionUserId();
          setPhase("name-entry");
        }
      })
      .catch(() => {
        setPhase("name-entry");
      });
  }, []);

  if (phase === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">불러오는 중…</p>
      </main>
    );
  }

  if (phase === "name-entry") {
    return (
      <NameEntry
        onComplete={(newUser) => {
          setUser(newUser);
          setPhase("ready");
        }}
      />
    );
  }

  // 슬라이스 2에서 이 자리에 지도가 들어간다
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <span
        data-testid="my-color"
        className="inline-block h-16 w-16 rounded-full border-4 border-white shadow-lg"
        style={{ backgroundColor: user!.color }}
      />
      <p className="text-xl">
        <strong>{user!.name}</strong> 님, 환영해요!
      </p>
      <p className="text-sm text-gray-500">
        이 색이 지도에서 내 맛집 핀 색이 돼요 (지도는 곧 추가됩니다)
      </p>
    </main>
  );
}
