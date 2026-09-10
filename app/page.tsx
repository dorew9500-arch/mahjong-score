import Link from "next/link";

// 並びは、使うものが先。スコア表はこのツールで一番他と違うところなので上段に置く。
// 牌効率は中身が無いのでここから外した（ページ自体は残してある。作ったら戻す）。
const FEATURES = [
  {
    href: "/calculator",
    icon: "🀄",
    title: "点数計算",
    desc: "手牌を入力して役・符・点数を自動計算。ローカル役も設定できます",
    color: "#d4a843",
  },
  {
    href: "/scoreboard",
    icon: "📊",
    title: "スコア表",
    desc: "半荘ごとの点数から、ウマ・オカ込みの累計を自動で出します",
    color: "#4ad47a",
  },
  {
    href: "/table",
    icon: "📋",
    title: "点数早見表",
    desc: "翻・符から点数をすぐに確認",
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
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0 0 6px" }}>
          点数計算・成績記録・クイズ
        </p>
        {/* 他と違うのはここなので、最初に見える場所に置く */}
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0, lineHeight: 1.5 }}>
          返し点もウマもローカル役も、自分の卓のルールに合わせられます
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
