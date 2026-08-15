import { test, expect } from "@playwright/test";

// 슬라이스 2: 카카오맵 표시
// 실제 카카오 SDK를 로드하므로 네트워크 + 유효한 NEXT_PUBLIC_KAKAO_JS_KEY 필요.
test("이름 입력 후 카카오맵이 렌더링된다", async ({ page }) => {
  const name = `map${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/");
  await page.getByRole("textbox", { name: "이름" }).fill(name);
  await page.getByRole("button", { name: "시작하기" }).click();

  // AC2: 지도 컨테이너 표시 + SDK 로드 + 지도 타일 생성
  const mapEl = page.getByTestId("kakao-map");
  await expect(mapEl).toBeVisible();
  await page.waitForFunction(() => !!window.kakao?.maps?.Map, undefined, {
    timeout: 15_000,
  });
  // 지도가 실제로 그려지면 컨테이너 안에 카카오가 만든 DOM이 생긴다
  await expect
    .poll(async () => mapEl.evaluate((el) => el.childElementCount), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);

  // AC3: 지도 위 배지에 내 이름/색상
  const badge = page.getByTestId("my-badge");
  await expect(badge).toBeVisible();
  await expect(badge).toContainText(name);
});

// fit bounds: 기본 중심(서울시청)에서 먼 핀도 접속 시 화면에 들어온다
test("멀리 있는 친구 핀도 접속하면 지도에 보인다", async ({ browser }) => {
  const stamp = Math.random().toString(36).slice(2, 8);
  const nameA = `멀a${stamp}`.slice(0, 12);
  const nameB = `멀b${stamp}`.slice(0, 12);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    // A가 부산(기본 뷰포트 밖) 맛집 저장
    await pageA.goto("/");
    await pageA.getByRole("textbox", { name: "이름" }).fill(nameA);
    await pageA.getByRole("button", { name: "시작하기" }).click();
    await pageA.getByRole("button", { name: "+ 맛집 추가" }).click();
    await pageA.getByRole("textbox", { name: "가게 검색" }).fill("부산 돼지국밥");
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
    await expect(pageA.getByTestId("place-info")).toBeVisible();

    // B가 새로 접속 → fit bounds 덕분에 부산 핀이 뷰포트 안에 들어온다
    await pageB.goto("/");
    await pageB.getByRole("textbox", { name: "이름" }).fill(nameB);
    await pageB.getByRole("button", { name: "시작하기" }).click();
    await expect(
      pageB
        .locator(`[data-testid="place-pin"][data-place-name="${placeName}"][title*="${nameA}"]`)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
