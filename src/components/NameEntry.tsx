"use client";

import { useState } from "react";
import { normalizeName, MAX_NAME_LENGTH } from "@/lib/username";
import { getOrCreateUser, type User } from "@/lib/users";
import { saveSessionUserId } from "@/lib/session";

type Props = {
  onComplete: (user: User) => void;
};

export default function NameEntry({ onComplete }: Props) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = normalizeName(raw);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const user = await getOrCreateUser(result.name);
      saveSessionUserId(user.id);
      onComplete(user);
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">맛집공유 🍜</h1>
        <p className="text-center text-sm text-gray-500">
          이름을 입력하면 나만의 색을 배정받아요
        </p>
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="이름"
          maxLength={MAX_NAME_LENGTH + 4}
          autoFocus
          aria-label="이름"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "시작하는 중…" : "시작하기"}
        </button>
      </form>
    </main>
  );
}
