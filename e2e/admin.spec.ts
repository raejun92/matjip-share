import { test, expect, type Page } from "@playwright/test";

// 슬라이스 18: 관리 페이지 — 로컬 .env.local의 ADMIN_KEY=local-admin-key 사용
async function enterAs(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);
}

test("잘못된 키는 거부되고, 올바른 키는 유저 목록을 보여준다", async ({
  page,
}) => {
  const name = `관리대상${Math.random().toString(36).slice(2, 6)}`.slice(0, 12);
  await enterAs(page, name);

  await page.goto("/admin");
  // AC1: 잘못된 키 → 거부
  await page.getByRole("textbox", { name: "관리자 키" }).fill("틀린키");
  await page.getByRole("button", { name: "입장" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "올바르지 않습니다" }),
  ).toBeVisible();

  // 올바른 키 → 목록 (방금 만든 유저 포함)
  await page.getByRole("textbox", { name: "관리자 키" }).fill("local-admin-key");
  await page.getByRole("button", { name: "입장" }).click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/유저 \d+명/)).toBeVisible();
});

test("유저를 삭제하면 핀도 지워지고, 그 세션은 이름 입력으로 돌아간다", async ({
  page,
}) => {
  const name = `삭제대상${Math.random().toString(36).slice(2, 6)}`.slice(0, 12);
  await enterAs(page, name);

  // 핀 하나 저장 (핀 동반 삭제 확인용)
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill("시청 만두");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const first = page.getByTestId("add-place-sheet").locator("li button").first();
  await expect(first).toBeVisible({ timeout: 10_000 });
  await first.click();
  await page.getByRole("button", { name: "별점 3점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByTestId("place-info")).toBeVisible();

  // AC2: 관리 페이지에서 삭제
  await page.goto("/admin");
  await page.getByRole("textbox", { name: "관리자 키" }).fill("local-admin-key");
  await page.getByRole("button", { name: "입장" }).click();
  const row = page.locator("li").filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(row).toContainText("핀 1개");
  await row.getByRole("button", { name: "삭제", exact: true }).click();
  await row.getByRole("button", { name: "정말 삭제" }).click();
  await expect(page.locator("li").filter({ hasText: name })).not.toBeVisible({
    timeout: 10_000,
  });

  // AC3: 삭제된 계정의 세션 → 이름 입력 화면
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "이름" })).toBeVisible({
    timeout: 10_000,
  });
});