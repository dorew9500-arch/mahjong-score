import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "麻雀点数計算ツール | 手牌入力で役・符・点数を自動計算",
  description: "麻雀の手牌を入力するだけで役・符・点数をリアルタイムで自動計算。フリー・競技ルール対応。",
  keywords: ["麻雀", "点数計算", "役一覧", "符計算", "初心者"],
  openGraph: {
    title: "麻雀点数計算ツール",
    description: "手牌を入力するだけで役・符・点数を自動計算",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
