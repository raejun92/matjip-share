import { test, expect, type Page } from "@playwright/test";

// 슬라이스 19: 한줄평 (AC2, AC3)
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

test("한줄평과 함께 저장하면 카드와 목록에 표시되고, 수정도 된다", async ({
  page,
}) => {
  const name = `평${Math.random().toString(36).slice(2, 7)}`;
  await enterAs(page, name);

  // 저장 시 한줄평 입력 (AC2)
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill("시청 냉면");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const first = page.getByTestId("add-place-sheet").locator("li button").first();
  await expect(first).toBeVisible({ timeout: 10_000 });
  await first.click();
  await page.getByRole("button", { name: "별점 4점" }).click();
  await page.getByRole("textbox", { name: "한줄평" }).fill("물냉 최고. 곱빼기 필수");
  await page.getByRole("button", { name: "저장", exact: true }).click();

  // 카드에 한줄평 표시
  const info = page.getByTestId("place-info");
  await expect(info).toBeVisible();
  await expect(page.getByTestId("place-comment")).toContainText(
    "물냉 최고. 곱빼기 필수",
  );

  // 목록에도 표시
  await page.getByRole("button", { name: "정보 닫기" }).click();
  await page.getByRole("button", { name: "☰ 목록" }).click();
  await expect(
    page.getByTestId("place-list-sheet").getByText("물냉 최고. 곱빼기 필수"),
  ).toBeVisible();
  await page.getByTestId("place-list-sheet").getByRole("button", { name: "닫기" }).click();

  // 수정 (AC3): 카드 → 수정 → 한줄평 변경
  await page.getByTestId("filter-chips").getByRole("button", { name }).click();
  await page.getByRole("button", { name: "☰ 목록" }).click();
  await page
    .getByTestId("place-list-sheet")
    .locator("li button")
    .first()
    .click();
  await expect(info).toBeVisible();
  await info.getByRole("button", { name: "수정", exact: true }).click();
  await info.getByRole("textbox", { name: "한줄평 수정" }).fill("비냉이 더 낫다");
  await info.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByTestId("place-comment")).toContainText("비냉이 더 낫다");
});