import { supabase } from "./supabase";

// Web Push 구독 관리 (slice 24) — 브라우저 경계 코드

export type PushState =
  | "unsupported" // 브라우저/환경 미지원 (iOS 사파리 탭 등)
  | "denied" // 권한 거부됨
  | "subscribed"
  | "unsubscribed";

function vapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

/** VAPID 공개키(base64url) → PushManager가 요구하는 BufferSource */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    vapidPublicKey().length > 0
  );
}

export async function getPushState(): Promise<PushState> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "subscribed" : "unsubscribed";
}

/** 알림 켜기: SW 등록 → 권한 → 구독 → DB 저장 */
export async function subscribePush(userId: string): Promise<PushState> {
  if (!isSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // 푸시 = 반드시 사용자에게 보이는 알림 (조용한 추적 금지 서약)
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
  });

  const json = subscription.toJSON();
  // 같은 endpoint가 있으면 갈아끼움 (기기 재구독/이름 전환 대응)
  await supabase.from("push_subscriptions").delete().eq("endpoint", json.endpoint!);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
  });
  if (error) {
    await subscription.unsubscribe();
    throw new Error(`구독 저장 실패: ${error.message}`);
  }
  return "subscribed";
}

/** 알림 끄기: 브라우저 구독 해지 + DB 제거 */
export async function unsubscribePush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
  return "unsubscribed";
}

/** 핀 저장 후 발송 트리거 (실패해도 저장 흐름엔 영향 없음) */
export function notifyNewPlace(placeId: string): void {
  void fetch("/api/notify-new-place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId }),
  }).catch(() => {
    // 알림 실패는 조용히 무시 — 다음 핀에서 다시 시도된다
  });
}
