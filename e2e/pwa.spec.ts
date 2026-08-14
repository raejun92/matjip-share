import { test, expect } from "@playwright/test";

// 슬라이스 14: PWA 설치 요건 (manifest + 아이콘 + iOS 메타)
test("manifest가 올바른 내용으로 서빙된다", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBe("맛집공유");
  expect(manifest.display).toBe("standalone");
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
});

test("아이콘 파일들이 서빙된다", async ({ request }) => {
  for (const path of [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/apple-touch-icon.png",
  ]) {
    const res = await request.get(path);
    expect(res.ok(), path).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});

test("페이지 head에 manifest 링크와 iOS 메타가 있다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    /manifest\.webmanifest/,
  );
  await expect(
    page.locator('link[rel="apple-touch-icon"]'),
  ).toHaveAttribute("href", /apple-touch-icon/);
  await expect(
    page.locator('meta[name="mobile-web-app-capable"]'),
  ).toHaveAttribute("content", "yes");
});
