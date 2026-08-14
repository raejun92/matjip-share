import { test, expect, type Page } from "@playwright/test";

// 슬라이스 15: 이름 바꾸기 + 다른 이름으로 접속
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

test("이름을 바꾸면 배지와 내 핀 작성자 표시가 갱신된다", async ({ page }) => {
  const stamp = Math.random().toString(36).slice(2, 7);
  const before = `오타${stamp}`.slice(0, 12);
  const after = `수정${stamp}`.slice(0, 12);
  await enterAs(page, before);

  // 핀 하나 저장 (작성자 표시 갱신 확인용)
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill("시청 카페");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const first = page.getByTestId("add-place-sheet").locator("li button").first();
  await expect(first).toBeVisible({ timeout: 10_000 });
  const placeName = await first.locator("span").first().textContent();
  await first.click();
  await page.getByRole("button", { name: "별점 3점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "정보 닫기" }).click();

  // AC2: 배지 → 이름 바꾸기
  await page.getByTestId("my-badge").click();
  await page.getByRole("button", { name: /이름 바꾸기/ }).click();
  await page.getByRole("textbox", { name: "새 이름" }).fill(after);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByTestId("my-badge")).toContainText(after);

  // 내 핀의 작성자 표시도 새 이름으로
  const myPin = page.locator(
    `[data-testid="place-pin"][title="${placeName} (${after})"]`,
  );
  await expect(myPin.first()).toBeVisible({ timeout: 10_000 });

  // 새로고침해도 새 이름 유지 (같은 계정)
  await page.reload();
  await expect(page.getByTestId("my-badge")).toContainText(after);
});

test("이미 있는 이름으로 바꾸면 오류를 보여준다", async ({ browser }) => {
  const stamp = Math.random().toString(36).slice(2, 7);
  const nameA = `갑${stamp}`.slice(0, 12);
  const nameB = `을${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await enterAs(pageB, nameB);
    await enterAs(pageA, nameA);

    await pageA.getByTestId("my-badge").click();
    await pageA.getByRole("button", { name: /이름 바꾸기/ }).click();
    await pageA.getByRole("textbox", { name: "새 이름" }).fill(nameB);
    await pageA.getByRole("button", { name: "저장", exact: true }).click();
    await expect(
      pageA.getByRole("alert").filter({ hasText: "이미 사용 중" }),
    ).toBeVisible();
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test("다른 이름으로 접속하면 입력 화면을 거쳐 새 계정으로 시작한다", async ({
  page,
}) => {
  const stamp = Math.random().toString(36).slice(2, 7);
  const first = `일차${stamp}`.slice(0, 12);
  const second = `이차${stamp}`.slice(0, 12);
  await enterAs(page, first);

  // AC3: 배지 → 다른 이름으로 접속
  await page.getByTestId("my-badge").click();
  await page.getByRole("button", { name: /다른 이름으로 접속/ }).click();
  await expect(page.getByRole("textbox", { name: "이름" })).toBeVisible();

  await page.getByRole("textbox", { name: "이름" }).fill(second);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(second);

  // 새로고침 후에도 두 번째 계정 유지
  await page.reload();
  await expect(page.getByTestId("my-badge")).toContainText(second);
});