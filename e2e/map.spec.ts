import { test, expect } from "@playwright/test";

// 슬라이스 2: 카카오맵 표시
// 실제 카카오 SDK를 로드하므로 네트워크 + 유효한 NEXT_PUBLIC_KAKAO_JS_KEY 필요.
test("이름 입력 후 카카오맵이 렌더링된다", async ({ page }) => {
  const name = `map${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();

  // AC2: 지도 컨테이너 표시 + SDK 로드 + 지도 타일 생성
  const mapEl = page.getByTestId("kakao-map");
  await expect(mapEl).toBeVisible();
  await page.waitForFunction(() => !!window.kakao?.maps?.Map, undefined, {
    timeout: 15_000,
  });
  // 지도가 실제로 그려지면 컨테이너 안에 카카오가 만든 DOM이 생긴다
  await expect
    .poll(async () => mapEl.evaluate((el) => el.childElementCount), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);

  // AC3: 지도 위 배지에 내 이름/색상
  const badge = page.getByTestId("my-badge");
  await expect(badge).toBeVisible();
  await expect(badge).toContainText(name);
});
