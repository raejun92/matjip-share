import { describe, it, expect } from "vitest";
import { buildKakaoSdkUrl } from "./kakao";

// AC1: SDK URL이 키/옵션으로 올바르게 조립된다
describe("buildKakaoSdkUrl", () => {
  it("키를 넣어 dapi.kakao.com SDK URL을 만든다", () => {
    const url = new URL(buildKakaoSdkUrl("my-key"));
    expect(url.origin).toBe("https://dapi.kakao.com");
    expect(url.pathname).toBe("/v2/maps/sdk.js");
    expect(url.searchParams.get("appkey")).toBe("my-key");
  });

  it("수동 초기화를 위해 autoload=false를 포함한다", () => {
    const url = new URL(buildKakaoSdkUrl("my-key"));
    expect(url.searchParams.get("autoload")).toBe("false");
  });

  it("키가 비어 있으면 예외를 던진다 (환경변수 누락 조기 발견)", () => {
    expect(() => buildKakaoSdkUrl("")).toThrow(/NEXT_PUBLIC_KAKAO_JS_KEY/);
  });
});
