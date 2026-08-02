import { test, expect, type Page } from "@playwright/test";

// 슬라이스 6: 위치로 맛집 추가 (AC2~AC4)
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

async function clickMapCenter(page: Page) {
  // 지도가 뜬 뒤 중앙(서울시청 인근 — 주변 가게 밀집)을 탭
  await page.waitForFunction(() => !!window.kakao?.maps?.Map, undefined, {
    timeout: 15_000,
  });
  const map = page.getByTestId("kakao-map");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("지도를 탭하면 주변 가게 목록에서 골라 저장할 수 있다", async ({
  page,
}) => {
  const name = `근처${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  // AC2: 탭 → 임시 마커 + popover → 주변 목록
  await clickMapCenter(page);
  await expect(page.getByTestId("picked-point")).toBeVisible();
  await page.getByRole("button", { name: "이 위치 주변에서 찾기" }).click();
  const sheet = page.getByTestId("nearby-sheet");
  await expect(sheet).toBeVisible();
  const firstItem = sheet.locator("li button").first();
  await expect(firstItem).toBeVisible({ timeout: 10_000 });
  await expect(firstItem).toContainText("m"); // 거리 표시

  // AC3: 선택 → 별점 → 저장 → 내 색 핀
  const placeName = await firstItem.locator("span").first().textContent();
  await firstItem.click();
  await page.getByRole("button", { name: "별점 5점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(
    page
      .locator(`[data-testid="place-pin"][title="${placeName} (${name})"]`)
      .first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("place-info")).toContainText(placeName!);
});

test("목록에 없는 가게는 직접 입력으로 탭 지점에 저장할 수 있다", async ({
  page,
}) => {
  const name = `직접${Math.random().toString(36).slice(2, 7)}`;
  const shopName = `우리단골집${Math.random().toString(36).slice(2, 6)}`;
  await enterAs(page, name);

  await clickMapCenter(page);
  await page.getByRole("button", { name: "이 위치 주변에서 찾기" }).click();
  const sheet = page.getByTestId("nearby-sheet");
  await expect(
    sheet.getByRole("button", { name: /직접 입력/ }),
  ).toBeVisible({ timeout: 10_000 });

  // AC4: 직접 입력 → 이름 + 별점 → 저장
  await sheet.getByRole("button", { name: /직접 입력/ }).click();
  await sheet.getByRole("textbox", { name: "가게 이름" }).fill(shopName);
  await page.getByRole("button", { name: "별점 3점" }).click();
  await page.getByRole("button", { name: "이 위치에 저장" }).click();
  await expect(sheet).not.toBeVisible();
  await expect(
    page
      .locator(`[data-testid="place-pin"][title="${shopName} (${name})"]`)
      .first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("popover의 취소를 누르면 지점 선택이 사라진다", async ({ page }) => {
  const name = `취소${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  await clickMapCenter(page);
  await expect(page.getByTestId("picked-point")).toBeVisible();
  await page.getByRole("button", { name: "지점 선택 취소" }).click();
  await expect(page.getByTestId("picked-point")).not.toBeVisible();
});
