import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

// ★打ち出しについて。
//   このツールの他と違うところは「計算できること」ではなく、
//   返し点・ウマ・ローカル役まで自分の卓のルールに合わせられること。
//   点数計算ツールは山ほどあるので、そこだけで名乗ると埋もれる。
//   スコア表も外から見えていなかったので、題名に入れている。
//   レート（金額）には触れない。既定は 0 で、無くても成立する機能なので。
export const metadata: Metadata = {
  title: "麻雀 点数計算＆成績記録 | 自分の卓のルールに合わせられる",
  description:
    "手牌を入力すると役・符・点数を自動計算。半荘ごとの成績を記録して、順位・ウマ・オカ込みの累計も出せます。返し点もウマもローカル役も、自分の卓のルールに合わせて設定できます。",
  keywords: [
    "麻雀", "点数計算", "符計算", "成績記録", "スコア表",
    "ウマ", "オカ", "返し点", "ローカル役", "役一覧",
  ],
  openGraph: {
    title: "麻雀 点数計算＆成績記録",
    description:
      "点数計算も成績記録も、自分の卓のルールに合わせて設定できる麻雀ツール",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
