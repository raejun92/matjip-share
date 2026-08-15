import { test, expect, type Page } from "@playwright/test";

// 슬라이스 22: 같은 가게 핀 병합 (AC2, AC3)

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

test("같은 가게를 두 명이 저장하면 핀이 하나로 합쳐지고 카드에 둘 다 보인다", async ({
  browser,
}) => {
  const stamp = Math.random().toString(36).slice(2, 7);
  const nameA = `합a${stamp}`.slice(0, 12);
  const nameB = `합b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    // A가 가게 저장 (한줄평 포함)
    await enterAs(pageA, nameA);
    await pageA.getByRole("button", { name: "+ 맛집 추가" }).click();
    await pageA.getByRole("textbox", { name: "가게 검색" }).fill("시청 설렁탕");
    await pageA.getByRole("button", { name: "검색", exact: true }).click();
    const first = pageA
      .getByTestId("add-place-sheet")
      .locator("li button")
      .first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    const placeName = await first.locator("span").first().textContent();
    await first.click();
    await pageA.getByRole("button", { name: "별점 5점" }).click();
    await pageA.getByRole("textbox", { name: "한줄평" }).fill("국물 진함");
    await pageA.getByRole("button", { name: "저장", exact: true }).click();
    await expect(pageA.getByTestId("place-info")).toBeVisible();

    // B가 A의 핀을 탭 → "나도 별점 남기기" (AC3)
    await enterAs(pageB, nameB);
    const pinOnB = pageB.locator(
      `[data-testid="place-pin"][data-place-name="${placeName}"]`,
    );
    await expect(pinOnB.first()).toBeVisible({ timeout: 15_000 });
    await openCardViaList(pageB, nameA, placeName!);
    const infoB = pageB.getByTestId("place-info");
    await expect(infoB).toContainText(nameA);
    await infoB.getByRole("button", { name: /나도 별점 남기기/ }).click();
    await infoB.getByRole("button", { name: "별점 3점" }).click();
    await infoB.getByRole("textbox", { name: "내 한줄평" }).fill("난 보통");
    await infoB.getByRole("button", { name: "저장", exact: true }).click();

    // AC2: 카드에 두 명의 행
    await expect(infoB.getByTestId("place-entry")).toHaveCount(2, {
      timeout: 10_000,
    });
    await expect(infoB).toContainText(nameA);
    await expect(infoB).toContainText(nameB);
    await expect(infoB).toContainText("국물 진함");
    await expect(infoB).toContainText("난 보통");

    // 핀은 하나로 병합 (제목에 두 명, data-place-name 기준 1개)
    await infoB.getByRole("button", { name: "정보 닫기" }).click();
    await expect(pinOnB).toHaveCount(1);
    const title = await pinOnB.first().getAttribute("title");
    expect(title).toContain(nameA);
    expect(title).toContain(nameB);

    // A 화면에서도 실시간으로 병합 카드에 B 행이 보인다
    const infoA = pageA.getByTestId("place-info");
    await expect(infoA.getByTestId("place-entry")).toHaveCount(2, {
      timeout: 15_000,
    });
    await expect(infoA).toContainText(nameB);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});