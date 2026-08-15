import { test, expect, type Page } from "@playwright/test";

// 슬라이스 4 AC3: A가 핀을 추가하면 B 지도에 새로고침 없이 나타난다

/** 핀 밀집과 무관한 결정적 카드 열기: 목록에서 가게+작성자 행 탭 */
async function openCardViaList(page: Page, author: string, placeName: string) {
  await page.getByRole("button", { name: "☰ 목록" }).click();
  await page
    .getByTestId("place-list-sheet")
    .locator("li")
    .filter({ hasText: placeName })
    .filter({ hasText: author })
    .first()
    .locator("button")
    .click();
  await page.getByTestId("place-info").waitFor({ timeout: 10_000 });
}

async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

test("친구가 추가한 핀이 내 지도에 실시간으로 나타난다", async ({
  browser,
}) => {
  const stamp = Math.random().toString(36).slice(2, 8);
  const nameA = `실친a${stamp}`.slice(0, 12);
  const nameB = `실친b${stamp}`.slice(0, 12);

  // 서로 다른 브라우저 컨텍스트 = 서로 다른 기기/사용자
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await enterAs(pageA, nameA);
    await enterAs(pageB, nameB);

    // B는 지도만 보고 있는다 (이후 새로고침 없음)

    // A가 맛집 추가
    await pageA.getByRole("button", { name: "+ 맛집 추가" }).click();
    await pageA.getByRole("textbox", { name: "가게 검색" }).fill("을지로 골뱅이");
    await pageA.getByRole("button", { name: "검색", exact: true }).click();
    const firstResult = pageA
      .getByTestId("add-place-sheet")
      .locator("li button")
      .first();
    await expect(firstResult).toBeVisible({ timeout: 10_000 });
    const placeName = await firstResult.locator("span").first().textContent();
    await firstResult.click();
    await pageA.getByRole("button", { name: "별점 4점" }).click();
    await pageA.getByRole("button", { name: "저장", exact: true }).click();
    await expect(pageA.getByTestId("place-info")).toBeVisible();

    // B 화면에 새로고침 없이 핀 등장 (A의 색으로)
    // title의 작성자로 이번 실행의 핀만 짚는다 (이전 실행 데이터와 구분)
    const pinOnB = pageB.locator(
      `[data-testid="place-pin"][data-place-name="${placeName}"][title*="${nameA}"]`,
    );
    await expect(pinOnB.first()).toBeVisible({ timeout: 15_000 });

    // 카드 열기 → 작성자가 A로 표시
    await openCardViaList(pageB, nameA, placeName!);
    const infoOnB = pageB.getByTestId("place-info");
    await expect(infoOnB).toContainText(placeName!);
    await expect(infoOnB).toContainText(nameA);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
