import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "맛집공유",
  description: "친구들끼리 지도에 맛집을 공유하는 앱",
  // 카카오톡 등 링크 미리보기(OG 카드). 이미지는 app/opengraph-image.png 규약이 자동 처리
  metadataBase: new URL("https://matjip-share.vercel.app"),
  openGraph: {
    title: "맛집공유 🍜",
    description: "친구들끼리 지도에 맛집을 공유해요",
    type: "website",
    locale: "ko_KR",
  },
  // iOS 홈 화면 설치용 (사파리는 manifest 아이콘 대신 이걸 쓴다)
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true, // 설치 시 주소창 없는 전체 화면
    title: "맛집공유",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
