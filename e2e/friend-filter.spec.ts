import { test, expect, type Page } from "@playwright/test";

// 슬라이스 10: 친구 필터 칩 (AC2, AC3)
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

async function addPlaceViaUi(page: Page, query: string) {
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill(query);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const first = page.getByTestId("add-place-sheet").locator("li button").first();
  await expect(first).toBeVisible({ timeout: 10_000 });
  const placeName = await first.locator("span").first().textContent();
  await first.click();
  await page.getByRole("button", { name: "별점 4점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByTestId("place-info")).toBeVisible();
  await page.getByRole("button", { name: "정보 닫기" }).click();
  return placeName!;
}

test("친구 칩을 탭하면 그 친구 핀만 보이고, 다시 탭하면 전체로 돌아온다", async ({
  browser,
}) => {
  const stamp = Math.random().toString(36).slice(2, 7);
  const nameA = `필a${stamp}`.slice(0, 12);
  const nameB = `필b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    // A와 B가 서로 다른 지역에 핀 저장
    await enterAs(pageA, nameA);
    const placeA = await addPlaceViaUi(pageA, "시청 김밥");
    await enterAs(pageB, nameB);
    const placeB = await addPlaceViaUi(pageB, "부산 돼지국밥");

    // B 화면: 칩 목록에 A와 B 모두 표시
    const chips = pageB.getByTestId("filter-chips");
    await expect(chips.getByRole("button", { name: nameA })).toBeVisible({
      timeout: 15_000,
    });
    await expect(chips.getByRole("button", { name: nameB })).toBeVisible();

    // AC2: A 칩 탭 → A 핀만 렌더링 (B 핀은 DOM에서 제거) + 화면 맞춤으로 A 핀 보임
    await chips.getByRole("button", { name: nameA }).click();
    const pinA = pageB.locator(
      `[data-testid="place-pin"][data-place-name="${placeA}"][title*="${nameA}"]`,
    );
    const pinB = pageB.locator(
      `[data-testid="place-pin"][data-place-name="${placeB}"][title*="${nameB}"]`,
    );
    await expect(pinA.first()).toBeVisible({ timeout: 10_000 });
    await expect(pinB).toHaveCount(0);

    // AC3: 다시 탭 → 전체 복귀 (B 핀이 다시 존재)
    await chips.getByRole("button", { name: nameA }).click();
    await expect(
      pageB.locator(`[data-testid="place-pin"][title*="(${nameB})"]`).first(),
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});