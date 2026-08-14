import { test, expect, type Page } from "@playwright/test";

// 슬라이스 6·7: 위치로 맛집 추가 (스마트 탭)
// 탭 후 popover는 최근접 가게 30m 판정에 따라 "N 추가하기" 또는
// "이 위치 주변에서 찾기"가 뜬다. 지도 중심은 병렬 테스트 데이터에 따라
// 달라질 수 있으므로 목록 진입은 두 경우 모두 열리는 /주변/ 버튼을 쓴다.
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

async function tapMapCenter(page: Page) {
  await page.waitForFunction(() => !!window.kakao?.maps?.Map, undefined, {
    timeout: 15_000,
  });
  const map = page.getByTestId("kakao-map");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId("picked-point")).toBeVisible();
}

/** popover에서 주변 목록 시트 열기 (직접 제안 여부와 무관하게 동작) */
async function openNearbyList(page: Page) {
  await page
    .getByRole("button", { name: /주변 (더 보기|에서 찾기)/ })
    .click({ timeout: 10_000 });
  await expect(page.getByTestId("nearby-sheet")).toBeVisible();
}

test("지도를 탭하면 주변 가게 목록에서 골라 저장할 수 있다", async ({
  page,
}) => {
  const name = `근처${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  await tapMapCenter(page);
  await openNearbyList(page);
  const sheet = page.getByTestId("nearby-sheet");
  const firstItem = sheet.locator("li button").first();
  await expect(firstItem).toBeVisible({ timeout: 10_000 });
  await expect(firstItem).toContainText("m");

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

test("가게 근접 탭이면 바로 추가 제안으로 저장할 수 있다 (스마트 탭)", async ({
  page,
}) => {
  const name = `스맛${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  await tapMapCenter(page);
  // 지도 중심이 가게 30m 내면 직접 제안, 아니면 목록으로 — 둘 다 저장까지 완주
  const directBtn = page.getByRole("button", { name: /추가하기$/ });
  const listBtn = page.getByRole("button", { name: /주변 (더 보기|에서 찾기)/ });
  await expect(directBtn.or(listBtn).first()).toBeVisible({ timeout: 10_000 });

  let placeName: string;
  if (await directBtn.isVisible()) {
    placeName = (await directBtn.innerText())
      .replace("📍", "")
      .replace("추가하기", "")
      .trim();
    await directBtn.click();
    // 별점 화면으로 바로 진입 (목록 건너뜀)
    await expect(page.getByTestId("nearby-sheet")).toContainText(placeName);
  } else {
    await listBtn.click();
    const firstItem = page
      .getByTestId("nearby-sheet")
      .locator("li button")
      .first();
    await expect(firstItem).toBeVisible({ timeout: 10_000 });
    placeName = (await firstItem.locator("span").first().textContent())!;
    await firstItem.click();
  }
  await page.getByRole("button", { name: "별점 4점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(
    page
      .locator(`[data-testid="place-pin"][title="${placeName} (${name})"]`)
      .first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("목록에 없는 가게는 직접 입력으로 탭 지점에 저장할 수 있다", async ({
  page,
}) => {
  const name = `직접${Math.random().toString(36).slice(2, 7)}`;
  const shopName = `우리단골집${Math.random().toString(36).slice(2, 6)}`;
  await enterAs(page, name);

  await tapMapCenter(page);
  await openNearbyList(page);
  const sheet = page.getByTestId("nearby-sheet");
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

  await tapMapCenter(page);
  await page.getByRole("button", { name: "지점 선택 취소" }).click();
  await expect(page.getByTestId("picked-point")).not.toBeVisible();
});

// popover가 하단 버튼을 가리지 않게: 지점 선택 중엔 목록/추가/내 위치 숨김
test("지점 선택 중엔 하단 버튼들이 숨고, 해제하면 돌아온다", async ({
  page,
}) => {
  const name = `숨김${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  await expect(page.getByRole("button", { name: "☰ 목록" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ 맛집 추가" })).toBeVisible();

  await tapMapCenter(page);
  await expect(page.getByRole("button", { name: "☰ 목록" })).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ 맛집 추가" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "내 위치로 이동" }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "지점 선택 취소" }).click();
  await expect(page.getByRole("button", { name: "☰ 목록" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ 맛집 추가" })).toBeVisible();
});

// 슬라이스 12: 임시 마커 재탭 → 해제
test("임시 마커를 다시 탭하면 마커가 사라진다", async ({ page }) => {
  const name = `재탭${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  await tapMapCenter(page);
  const marker = page.getByTestId("picked-point");
  await expect(marker).toBeVisible();

  // 마커 위치를 다시 탭 (마커는 pointer-events:none → 지도 탭으로 전달됨)
  const box = (await marker.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(marker).not.toBeVisible();
  // popover도 사라짐 (취소 버튼 없음)
  await expect(
    page.getByRole("button", { name: "지점 선택 취소" }),
  ).not.toBeVisible();

  // 다시 탭하면 새 지점 선택이 정상 동작 (토글 복귀)
  await tapMapCenter(page);
  await expect(page.getByTestId("picked-point")).toBeVisible();
});
