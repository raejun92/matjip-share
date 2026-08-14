"use client";

import { useState } from "react";

// 관리 페이지 (slice 18) — 메인 UI에서 링크하지 않음. ADMIN_KEY 필요.

type AdminUser = {
  id: string;
  name: string;
  color: string;
  created_at: string;
  pinCount: number;
};

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadUsers(adminKey: string) {
    setError(null);
    // 헤더는 Latin-1만 허용 — 한글 키를 위해 인코딩해서 보낸다 (서버에서 디코딩)
    const res = await fetch("/api/admin/users", {
      headers: { "x-admin-key": encodeURIComponent(adminKey) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "요청에 실패했어요.");
      setUsers(null);
      return;
    }
    setUsers((await res.json()).users);
  }

  async function handleEnter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await loadUsers(key);
    setBusy(false);
  }

  async function handleDelete(userId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users?id=${userId}`, {
      method: "DELETE",
      headers: { "x-admin-key": encodeURIComponent(key) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "삭제에 실패했어요.");
    } else {
      await loadUsers(key);
    }
    setConfirmId(null);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold">🔧 맛집공유 관리</h1>

      {users === null ? (
        <form onSubmit={handleEnter} className="mt-4 space-y-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="관리자 키"
            aria-label="관리자 키"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || key.length === 0}
            className="w-full rounded-lg bg-gray-800 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "확인 중…" : "입장"}
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            유저 {users.length}명 — 삭제하면 그 유저의 핀도 함께 지워져요.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <ul className="mt-3 divide-y divide-gray-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-2.5 py-3">
                <span
                  className="inline-block h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: u.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.name}</span>
                  <span className="block text-xs text-gray-400">
                    핀 {u.pinCount}개 · {new Date(u.created_at).toLocaleDateString("ko-KR")} 가입
                  </span>
                </span>
                {confirmId === u.id ? (
                  <span className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      disabled={busy}
                      className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      정말 삭제
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(u.id)}
                    className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600"
                  >
                    삭제
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
