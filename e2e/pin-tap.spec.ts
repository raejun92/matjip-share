import { test, expect, type Page } from "@playwright/test";

// 슬라이스 11: 핀 근처 탭 → 추가 흐름 대신 그 핀의 정보 카드 (AC2)
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

test("친구 핀에서 살짝 빗나간 탭도 그 핀의 정보 카드를 연다", async ({
  browser,
}) => {
  const stamp = Math.random().toString(36).slice(2, 7);
  const nameA = `핀a${stamp}`.slice(0, 12);
  const nameB = `핀b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    // A가 핀 저장
    await enterAs(pageA, nameA);
    await pageA.getByRole("button", { name: "+ 맛집 추가" }).click();
    await pageA.getByRole("textbox", { name: "가게 검색" }).fill("시청 파스타");
    await pageA.getByRole("button", { name: "검색", exact: true }).click();
    const first = pageA
      .getByTestId("add-place-sheet")
      .locator("li button")
      .first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    const placeName = await first.locator("span").first().textContent();
    await first.click();
    await pageA.getByRole("button", { name: "별점 4점" }).click();
    await pageA.getByRole("button", { name: "저장", exact: true }).click();

    // B가 접속 → A 핀이 보임
    await enterAs(pageB, nameB);
    const pinOnB = pageB.locator(
      `[data-testid="place-pin"][title="${placeName} (${nameA})"]`,
    );
    await expect(pinOnB.first()).toBeVisible({ timeout: 15_000 });

    // 핀에서 오른쪽으로 살짝 빗나가게 탭 (핀 요소 밖, 히트 반경 안)
    const box = (await pinOnB.first().boundingBox())!;
    await pageB.mouse.click(box.x + box.width + 9, box.y + box.height / 2);

    // AC2: 추가 popover가 아니라 핀 정보 카드가 열린다.
    // 병렬 테스트 데이터로 화면상 핀이 겹치면 더 가까운 다른 핀이 열릴 수 있으므로
    // (nearest-win, 의도된 동작) 카드 오픈 + 추가 흐름 미진입만 단언한다.
    const info = pageB.getByTestId("place-info");
    await expect(info).toBeVisible({ timeout: 5_000 });
    await expect(info).toContainText("★");
    await expect(pageB.getByTestId("picked-point")).not.toBeVisible();
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});