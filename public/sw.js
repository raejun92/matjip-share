// 맛집공유 Service Worker — 푸시 전용 (slice 24).
// fetch 핸들러를 의도적으로 두지 않는다: 오프라인 캐시는 실시간 앱에 해롭고,
// 없으면 배포 즉시 모든 사용자가 최신 버전을 받는 기존 동작이 유지된다.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // 페이로드가 JSON이 아니면 기본값으로
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "맛집공유 🍜", {
      body: data.body ?? "새 소식이 있어요",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const w of windows) {
          if ("focus" in w) return w.focus();
        }
        return clients.openWindow(url);
      }),
  );
});
