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
    icon: "📊",
    title: "牌効率",
    desc: "有効牌数を確認して最善の切り牌を探そう",
    color: "#4ad47a",
  },
];

export default function LandingPage() {
  return (
    <div style={{
      maxWidth: 480, margin: "0 auto",
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      padding: "0 16px",
    }}>
      {/* ヒーローヘッダー */}
      <div style={{ textAlign: "center", padding: "48px 0 36px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: 12, lineHeight: 1 }}>🀄</div>
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
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}>
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="card feature-card">
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>{f.icon}</div>
              <div style={{ fontWeight: "bold", fontSize: "1rem", color: f.color }}>
                {f.title}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                {f.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
