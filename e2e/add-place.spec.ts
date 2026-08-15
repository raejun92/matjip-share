import { test, expect } from "@playwright/test";

// 슬라이스 3: 검색 → 별점 → 저장 → 내 색 핀 (AC5, AC6)
// 실제 카카오 로컬 검색 API(서버 프록시 경유)를 사용한다.
test("맛집을 검색해 별점과 함께 저장하면 내 색 핀이 생긴다", async ({
  page,
}) => {
  const name = `pin${Math.random().toString(36).slice(2, 8)}`;

  // 접속 + 이름 입력
  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("my-badge")).toContainText(name);

  // 내 색상 (배지 기준) — 핀 색과 비교용
  const myColor = await page
    .getByTestId("my-color")
    .evaluate((el) => getComputedStyle(el).backgroundColor);

  // 검색 → 첫 결과 선택
  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill("스타벅스 시청");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const firstResult = page
    .getByTestId("add-place-sheet")
    .locator("li button")
    .first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  const placeName = await firstResult
    .locator("span")
    .first()
    .textContent();
  await firstResult.click();

  // 슬라이스 23: 선택하면 그 위치에 미리보기 마커
  await expect(page.getByTestId("preview-point")).toBeVisible({
    timeout: 5_000,
  });

  // 별점 4점 → 저장
  await page.getByRole("button", { name: "별점 4점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();

  // AC5: 시트 닫힘 + 내 색 핀 등장 + 미리보기 마커 제거
  // title엔 작성자가 포함되므로 이전 실행이 남긴 같은 이름의 핀과 구분된다
  await expect(page.getByTestId("add-place-sheet")).not.toBeVisible();
  await expect(page.getByTestId("preview-point")).not.toBeVisible();
  const myPin = page.locator(
    `[data-testid="place-pin"][data-place-name="${placeName}"][title*="${name}"]`,
  );
  await expect(myPin.first()).toBeVisible({ timeout: 10_000 });

  // 슬라이스 21: 기본 줌에선 핀 위에 가게 이름 라벨 표시
  await expect(myPin.first().getByText(placeName!)).toBeVisible();
  const pinFill = await myPin
    .first()
    .locator("path")
    .getAttribute("fill");
  // SVG fill(#RRGGBB)을 rgb()로 변환해 배지 색과 비교
  const [r, g, b] = [1, 3, 5].map((i) =>
    parseInt(pinFill!.slice(i, i + 2), 16),
  );
  expect(myColor).toBe(`rgb(${r}, ${g}, ${b})`);

  // AC6: 저장 직후 정보 카드에 가게명·별점·작성자 표시
  const info = page.getByTestId("place-info");
  await expect(info).toBeVisible();
  await expect(info).toContainText(placeName!);
  await expect(info).toContainText("4점");
  await expect(info).toContainText(name);

  // 카드 닫고 핀 클릭으로 다시 열기
  await page.getByRole("button", { name: "정보 닫기" }).click();
  await expect(info).not.toBeVisible();
  await myPin.first().locator("svg").click({ position: { x: 16, y: 30 } });
  await expect(page.getByTestId("place-info")).toContainText(placeName!);
});

test("재접속하면 저장했던 핀이 다시 보인다", async ({ page }) => {
  const name = `pin${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();

  await page.getByRole("button", { name: "+ 맛집 추가" }).click();
  await page.getByRole("textbox", { name: "가게 검색" }).fill("광화문 국밥");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  const firstResult = page
    .getByTestId("add-place-sheet")
    .locator("li button")
    .first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  const placeName = await firstResult.locator("span").first().textContent();
  await firstResult.click();
  await page.getByRole("button", { name: "별점 5점" }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByTestId("place-info")).toBeVisible();

  // 재접속: 저장된 핀이 로드된다
  await page.reload();
  await expect(page.getByTestId("my-badge")).toContainText(name);
  await expect(
    page
      .locator(`[data-testid="place-pin"][data-place-name="${placeName}"][title*="${name}"]`)
      .first(),
  ).toBeVisible({ timeout: 15_000 });
});
