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

  // 내 위치(모의: 부산)로 이동 + 파란 점 표시 (slice 16)
  await page.getByRole("button", { name: "내 위치로 이동" }).click();
  await expect(page.getByTestId("my-location")).toBeVisible({
    timeout: 10_000,
  });
  await page.waitForTimeout(1500); // pan 완료 대기

  // 이동 증거: 지도 중심을 탭 → 부산 콘텐츠가 떠야 함 (줌 레벨과 무관).
  // 탭 지점 근처에 핀이 있으면(슬라이스 11) 핀 카드가, 없으면 주변 시트가 뜬다 — 둘 다 부산이면 성공.
  const map = page.getByTestId("kakao-map");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const info = page.getByTestId("place-info");
  const picked = page.getByTestId("picked-point");
  await expect(info.or(picked).first()).toBeVisible({ timeout: 5_000 });
  if (await picked.isVisible().catch(() => false)) {
    await page
      .getByRole("button", { name: /주변 (더 보기|에서 찾기)/ })
      .click({ timeout: 10_000 });
    await expect(page.getByTestId("nearby-sheet")).toContainText("부산", {
      timeout: 10_000,
    });
  } else {
    await expect(info).toContainText("부산");
  }
});
