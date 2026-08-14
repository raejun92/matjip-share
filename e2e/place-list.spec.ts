import { test, expect, type Page } from "@playwright/test";

// 슬라이스 13: 맛집 목록 (AC2, AC3)
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

async function addPlaceViaUi(page: Page, query: string, ratingLabel: string) {
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill(query);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const first = page.getByTestId("add-place-sheet").locator("li button").first();
  await expect(first).toBeVisible({ timeout: 10_000 });
  const placeName = await first.locator("span").first().textContent();
  await first.click();
  await page.getByRole("button", { name: ratingLabel }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByTestId("place-info")).toBeVisible();
  await page.getByRole("button", { name: "정보 닫기" }).click();
  return placeName!;
}

test("목록에서 정렬을 바꾸고, 행을 탭하면 지도 카드가 열린다", async ({
  page,
}) => {
  const name = `목록${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  // 별점 5짜리 먼저, 2짜리 나중 (최신순과 별점순 결과가 달라지게)
  const five = await addPlaceViaUi(page, "시청 국수", "별점 5점");
  const two = await addPlaceViaUi(page, "시청 버거", "별점 2점");

  // 병렬 테스트 데이터와 분리: 내 칩으로 필터 (목록도 필터를 따른다)
  await page
    .getByTestId("filter-chips")
    .getByRole("button", { name })
    .click();

  await page.getByRole("button", { name: "☰ 목록" }).click();
  const sheet = page.getByTestId("place-list-sheet");
  await expect(sheet).toBeVisible();
  const rows = sheet.locator("li");
  await expect(rows).toHaveCount(2);

  // 최신순(기본): 나중에 저장한 2점짜리가 위
  await expect(rows.first()).toContainText(two);

  // AC3: 별점순 → 5점짜리가 위
  await sheet.getByRole("button", { name: "별점순" }).click();
  await expect(rows.first()).toContainText(five);

  // AC2: 행 탭 → 시트 닫힘 + 그 핀 카드 오픈
  await rows.first().locator("button").click();
  await expect(sheet).not.toBeVisible();
  await expect(page.getByTestId("place-info")).toContainText(five);
});