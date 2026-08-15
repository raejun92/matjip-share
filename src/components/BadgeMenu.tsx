"use client";

import { useState } from "react";
import { normalizeName, MAX_NAME_LENGTH } from "@/lib/username";
import { renameUser, type User } from "@/lib/users";
import {
  getPushState,
  subscribePush,
  unsubscribePush,
  type PushState,
} from "@/lib/push";

type Props = {
  user: User;
  onRenamed: (user: User) => void;
  onSwitchUser: () => void;
};

/** 내 배지 + 탭 메뉴: 이름 바꾸기 / 다른 이름으로 접속 (slice 15) */
export default function BadgeMenu({ user, onRenamed, onSwitchUser }: Props) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(user.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushState, setPushState] = useState<PushState>("unsupported");

  async function handlePushToggle() {
    setBusy(true);
    setError(null);
    try {
      if (pushState === "subscribed") {
        setPushState(await unsubscribePush());
      } else {
        const next = await subscribePush(user.id);
        setPushState(next);
        if (next === "denied") {
          setError("알림 권한이 거부돼 있어요. 브라우저 설정에서 허용해 주세요.");
        }
      }
    } catch {
      setError("알림 설정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const result = normalizeName(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.name === user.name) {
      setRenaming(false);
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const renamed = await renameUser(user.id, result.name);
      onRenamed(renamed);
      setRenaming(false);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이름 변경에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    // 필터 칩 줄(z-10)보다 위 — 메뉴가 칩에 덮이면 클릭이 가로채인다
    <div className="absolute left-3 top-3 z-20">
      <button
        type="button"
        data-testid="my-badge"
        onClick={() => {
          setOpen((v) => !v);
          setRenaming(false);
          setValue(user.name);
          setError(null);
          void getPushState().then(setPushState);
        }}
        className="flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-2 pr-4 shadow-md"
      >
        <span
          data-testid="my-color"
          className="inline-block h-5 w-5 rounded-full"
          style={{ backgroundColor: user.color }}
        />
        <span className="text-sm font-semibold">{user.name}</span>
      </button>

      {open && (
        <div
          data-testid="badge-menu"
          className="mt-1.5 w-52 rounded-xl bg-white p-2 shadow-xl"
        >
          {!renaming ? (
            <>
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-gray-50"
              >
                ✏️ 이름 바꾸기
              </button>
              <button
                type="button"
                onClick={onSwitchUser}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-gray-50"
              >
                🔄 다른 이름으로 접속
              </button>
              {pushState !== "unsupported" && (
                <button
                  type="button"
                  onClick={handlePushToggle}
                  disabled={busy}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  {pushState === "subscribed" ? "🔕 알림 끄기" : "🔔 알림 켜기"}
                </button>
              )}
              {error && (
                <p role="alert" className="px-3 py-1 text-xs text-red-600">
                  {error}
                </p>
              )}
            </>
          ) : (
            <form onSubmit={handleRename} className="space-y-2 p-1">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={MAX_NAME_LENGTH + 4}
                autoFocus
                aria-label="새 이름"
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-semibold text-gray-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "저장 중…" : "저장"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
