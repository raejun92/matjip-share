import { test, expect } from "@playwright/test";

// AC6(슬라이스 1): 첫 접속 → 이름 입력 → 색상 확인 → 재접속 시 입력 화면 스킵
// 슬라이스 2부터 입력 완료 후 화면은 지도(MapView) + 내 배지다.
// 로컬 Supabase 스택(supabase start)이 실행 중이어야 한다.
test("첫 접속 이름 입력 후 재접속하면 입력 화면을 건너뛴다", async ({ page }) => {
  const name = `e2e${Math.random().toString(36).slice(2, 8)}`;

  // 첫 접속: 이름 입력 화면
  await page.goto("/");
  const nameInput = page.getByRole("textbox", { name: "이름" });
  await expect(nameInput).toBeVisible();

  // 이름 제출 → 지도 화면의 내 배지에서 이름/색상 확인
  await nameInput.fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  const badge = page.getByTestId("my-badge");
  await expect(badge).toBeVisible();
  await expect(badge).toContainText(name);

  const colorChip = page.getByTestId("my-color");
  const color = await colorChip.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(color).not.toBe("rgba(0, 0, 0, 0)");

  // 재접속: 입력 화면 없이 바로 지도 화면 + 같은 색
  await page.reload();
  await expect(page.getByTestId("my-badge")).toContainText(name);
  await expect(page.getByRole("textbox", { name: "이름" })).not.toBeVisible();
  const colorAfterReload = await page
    .getByTestId("my-color")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(colorAfterReload).toBe(color);
});

test("빈 이름을 제출하면 오류를 보여준다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "이름을 입력" }),
  ).toBeVisible();
});
