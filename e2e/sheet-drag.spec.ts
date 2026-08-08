import { test, expect } from "@playwright/test";

// 슬라이스 9: 바텀 시트 드래그 핸들 (AC2, AC3)
test("핸들을 끌어 시트를 키우고, 바닥까지 끌면 닫힌다", async ({ page }) => {
  const name = `드래그${Math.random().toString(36).slice(2, 6)}`;

  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);

  // 검색 시트 열기 (지도 상태와 무관해 결정적)
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  const sheet = page.getByTestId("add-place-sheet");
  await expect(sheet).toBeVisible();
  const before = (await sheet.boundingBox())!;

  // AC2: 핸들을 위로 300px 드래그 → 확장(85dvh) 스냅
  const handle = sheet.getByTestId("sheet-handle");
  const hBox = (await handle.boundingBox())!;
  const hx = hBox.x + hBox.width / 2;
  const hy = hBox.y + hBox.height / 2;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx, hy - 300, { steps: 8 });
  await page.mouse.up();
  const expanded = (await sheet.boundingBox())!;
  expect(expanded.height).toBeGreaterThan(before.height + 100);

  // AC3: 핸들을 화면 바닥 근처까지 드래그 → 닫힘
  const hBox2 = (await handle.boundingBox())!;
  const viewport = page.viewportSize()!;
  await page.mouse.move(hBox2.x + hBox2.width / 2, hBox2.y + 5);
  await page.mouse.down();
  await page.mouse.move(hBox2.x + hBox2.width / 2, viewport.height - 30, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(sheet).not.toBeVisible();
});
