import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E(Playwright)가 127.0.0.1로 접속: Next 16은 cross-origin dev 리소스를 기본 차단
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
