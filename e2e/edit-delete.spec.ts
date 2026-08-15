import { test, expect, type Page } from "@playwright/test";

// 슬라이스 5: 핀 수정/삭제 (AC4~AC6)
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
  return placeName!;
}

test("내 핀은 별점을 수정할 수 있고, 수정 결과가 반영된다", async ({ page }) => {
  const name = `ed${Math.random().toString(36).slice(2, 8)}`;
  await enterAs(page, name);
  await addPlaceViaUi(page, "종로 김밥", "별점 2점");

  // AC4: 내 핀 카드엔 수정/삭제 버튼이 있다
  const info = page.getByTestId("place-info");
  await expect(info.getByRole("button", { name: "수정", exact: true })).toBeVisible();
  await expect(info.getByRole("button", { name: "삭제", exact: true })).toBeVisible();

  // AC5: 별점 2 → 5 수정
  await info.getByRole("button", { name: "수정", exact: true }).click();
  await info.getByRole("button", { name: "별점 5점으로 변경" }).click();
  await info.getByRole("button", { name: "저장", exact: true }).click();
  await expect(info).toContainText("5점");

  // 새로고침 후에도 유지
  await page.reload();
  await expect(page.getByTestId("my-badge")).toContainText(name);
});

test("내 핀을 삭제하면 지도에서 사라진다", async ({ page }) => {
  const name = `dl${Math.random().toString(36).slice(2, 8)}`;
  await enterAs(page, name);
  const placeName = await addPlaceViaUi(page, "종로 칼국수", "별점 3점");

  const info = page.getByTestId("place-info");
  await info.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(info).toContainText("정말 삭제할까요?");
  await info.getByRole("button", { name: "삭제", exact: true }).click();

  // 카드 닫히고 핀 제거
  await expect(info).not.toBeVisible();
  await expect(
    page.locator(`[data-testid="place-pin"][title="${placeName} (${name})"]`),
  ).toHaveCount(0);
});

test("친구 핀에는 수정/삭제 버튼이 보이지 않는다", async ({ browser }) => {
  const stamp = Math.random().toString(36).slice(2, 8);
  const nameA = `주인a${stamp}`.slice(0, 12);
  const nameB = `남b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await enterAs(pageA, nameA);
    const placeName = await addPlaceViaUi(pageA, "무교동 낙지", "별점 4점");

    await enterAs(pageB, nameB);
    const pinOnB = pageB.locator(
      `[data-testid="place-pin"][title="${placeName} (${nameA})"]`,
    );
    await expect(pinOnB.first()).toBeVisible({ timeout: 15_000 });
    await pinOnB.first().click();

    // AC4: 남의 핀 카드 — 버튼 없음
    const infoOnB = pageB.getByTestId("place-info");
    await expect(infoOnB).toContainText(placeName);
    await expect(
      infoOnB.getByRole("button", { name: "수정", exact: true }),
    ).not.toBeVisible();
    await expect(
      infoOnB.getByRole("button", { name: "삭제", exact: true }),
    ).not.toBeVisible();
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test("카드를 열어둔 채 친구가 별점을 고치면 카드도 실시간 갱신된다", async ({
  browser,
}) => {
  const stamp = Math.random().toString(36).slice(2, 8);
  const nameA = `수a${stamp}`.slice(0, 12);
  const nameB = `카b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await enterAs(pageA, nameA);
    const placeName = await addPlaceViaUi(pageA, "시청 커피", "별점 4점");

    // B가 그 핀의 카드를 열어둔다
    await enterAs(pageB, nameB);
    const pinOnB = pageB.locator(
      `[data-testid="place-pin"][title="${placeName} (${nameA})"]`,
    );
    await expect(pinOnB.first()).toBeVisible({ timeout: 15_000 });
    await pinOnB.first().click();
    const infoOnB = pageB.getByTestId("place-info");
    await expect(infoOnB).toContainText("4점");

    // A가 별점 수정 → B의 열린 카드가 갱신된다
    const infoOnA = pageA.getByTestId("place-info");
    await infoOnA.getByRole("button", { name: "수정", exact: true }).click();
    await infoOnA.getByRole("button", { name: "별점 2점으로 변경" }).click();
    await infoOnA.getByRole("button", { name: "저장", exact: true }).click();

    await expect(infoOnB).toContainText("2점", { timeout: 15_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test("친구가 핀을 삭제하면 내 지도에서도 실시간으로 사라진다", async ({
  browser,
}) => {
  const stamp = Math.random().toString(36).slice(2, 8);
  const nameA = `삭a${stamp}`.slice(0, 12);
  const nameB = `볼b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await enterAs(pageA, nameA);
    const placeName = await addPlaceViaUi(pageA, "을지로 냉면", "별점 5점");

    await enterAs(pageB, nameB);
    const pinOnB = pageB.locator(
      `[data-testid="place-pin"][title="${placeName} (${nameA})"]`,
    );
    await expect(pinOnB.first()).toBeVisible({ timeout: 15_000 });

    // AC6: A가 삭제 → B 화면에서 새로고침 없이 사라짐
    const infoOnA = pageA.getByTestId("place-info");
    await infoOnA.getByRole("button", { name: "삭제", exact: true }).click();
    await infoOnA.getByRole("button", { name: "삭제", exact: true }).click();

    await expect(pinOnB).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
