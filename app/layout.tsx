import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "泡泡射手 Roguelite｜试玩 Demo",
  description: "可发射、反弹、消除、掉落，并包含球包、压力与 Boss 意图的泡泡射手 Roguelite 试玩版。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
