import Link from "next/link";

const FEATURES = [
  {
    href: "/calculator",
    icon: "🀄",
    title: "点数計算",
    desc: "手牌を入力して役・符・点数を自動計算",
    color: "#d4a843",
  },
  {
    href: "/table",
    icon: "📋",
    title: "点数早見表",
    desc: "翻・符から点数をすぐに確認",
    color: "#d4a843",
  },
  {
    href: "/scoreboard",
    icon: "📊",
    title: "スコア表",
    desc: "4人の対局スコアを記録・集計",
    color: "#4ad47a",
  },
  {
    href: "/quiz/wait",
    icon: "❓",
    title: "待ちクイズ",
    desc: "テンパイ手牌から上がり牌を当てよう",
    color: "#4a9fd4",
  },
  {
    href: "/quiz/score",
    icon: "📝",
    title: "点数クイズ",
    desc: "手牌と状況から点数を当てよう",
    color: "#7a4ad4",
  },
  {
    href: "/efficiency",
    icon: "🔍",
    title: "牌効率",
    desc: "有効牌数を確認して最善の切り牌を探そう",
    color: "#d44a7a",
  },
];

export default function LandingPage() {
  return (
    <div style={{
      maxWidth: 480, margin: "0 auto",
      minHeight: "100vh",
      padding: "0 16px 24px",
    }}>
      {/* ヘッダー */}
      <div style={{ textAlign: "center", padding: "40px 0 28px" }}>
        <div style={{ fontSize: "3rem", marginBottom: 10, lineHeight: 1 }}>🀄</div>
        <h1 style={{
          fontSize: "1.75rem", fontWeight: "bold",
          color: "var(--accent)", margin: "0 0 8px",
          letterSpacing: "0.05em",
        }}>
          麻雀ツール
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
          点数計算・クイズ・牌効率分析
        </p>
      </div>

      {/* 機能カードグリッド */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card feature-card" style={{ height: "100%" }}>
              <div style={{ fontSize: "1.75rem", lineHeight: 1 }}>{f.icon}</div>
              <div style={{ fontWeight: "bold", fontSize: "0.95rem", color: f.color }}>
                {f.title}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                {f.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
