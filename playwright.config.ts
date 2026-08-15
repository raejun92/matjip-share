import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
// 카카오 개발자 앱에 등록된 도메인은 localhost:3000 (127.0.0.1은 SDK가 거부함)
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 로컬 1회 재시도: 로컬 Supabase Realtime 컨테이너가 부하로 재시작하며
  // 이벤트를 떨어뜨리는 인프라 플레이크 흡수 (코드 회귀는 재시도로도 실패함)
  retries: process.env.CI ? 2 : 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // 테스트 실행 시 dev 서버 자동 기동
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
