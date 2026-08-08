import { test, expect } from "@playwright/test";

// 슬라이스 8: 내 위치 버튼 — 모의 GPS 좌표(부산)로 이동 검증
test.use({
  geolocation: { latitude: 35.1796, longitude: 129.0756 }, // 부산
  permissions: ["geolocation"],
});

test("내 위치 버튼을 누르면 지도가 현재 위치로 이동한다", async ({ page }) => {
  const name = `위치${Math.random().toString(36).slice(2, 7)}`;

  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
  await page.waitForFunction(() => !!window.kakao?.maps?.Map, undefined, {
    timeout: 15_000,
  });
  await page.waitForTimeout(1000);

  // 내 위치(모의: 부산)로 이동
  await page.getByRole("button", { name: "내 위치로 이동" }).click();
  await page.waitForTimeout(1500); // pan 완료 대기

  // 이동 증거: 지도 중심을 탭 → 주변 시트의 좌표→주소가 부산이어야 함
  // (줌 레벨과 무관해 병렬 테스트 데이터에 영향받지 않는다)
  const map = page.getByTestId("kakao-map");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId("picked-point")).toBeVisible();
  await page
    .getByRole("button", { name: /주변 (더 보기|에서 찾기)/ })
    .click({ timeout: 10_000 });
  await expect(page.getByTestId("nearby-sheet")).toContainText("부산", {
    timeout: 10_000,
  });
});
