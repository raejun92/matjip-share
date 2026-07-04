const KEY = "matjip-share:user-id";

/** localStorage에 기억된 내 user id. 없으면 null */
export function loadSessionUserId(): string | null {
  return window.localStorage.getItem(KEY);
}

export function saveSessionUserId(id: string): void {
  window.localStorage.setItem(KEY, id);
}

/** DB에서 사용자가 사라졌을 때 등, 세션을 초기화한다 */
export function clearSessionUserId(): void {
  window.localStorage.removeItem(KEY);
}
