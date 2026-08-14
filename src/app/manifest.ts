import type { MetadataRoute } from "next";

// PWA 설치 선언 (slice 14) — /manifest.webmanifest로 서빙된다.
// Service Worker는 의도적으로 없음: 설치엔 불필요하고,
// 실시간 공유 앱이라 오프라인 캐시가 오히려 혼란을 준다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "맛집공유",
    short_name: "맛집공유",
    description: "친구들끼리 지도에 맛집을 공유하는 앱",
    start_url: "/",
    display: "standalone", // 주소창 없는 앱 화면
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable", // 안드로이드 원형/스퀘어클 마스킹 대응
      },
    ],
  };
}
