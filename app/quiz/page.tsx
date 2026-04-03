import Link from "next/link";

const QUIZZES = [
  {
    href: "/quiz/wait",
    icon: "❓",
    title: "待ちクイズ（初心者用）",
    desc: "テンパイ手牌を見て、上がれる牌をすべて選ぼう",
    badge: "準備中",
  },
  {
    href: "/quiz/score",
    icon: "📝",
    title: "点数クイズ",
    desc: "手牌と状況を見て、正しい点数を4択から選ぼう",
    badge: "準備中",
  },
];

export default function QuizPage() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
      <div style={{ padding: "16px 0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
          クイズ
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {QUIZZES.map((q) => (
          <Link key={q.href} href={q.href} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "20px 16px", cursor: "pointer",
            }}>
              <span style={{ fontSize: "2rem" }}>{q.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  {q.title}
                  <span style={{
                    fontSize: "0.65rem", padding: "2px 6px",
                    background: "var(--border)", borderRadius: 4,
                    color: "var(--text-muted)",
                  }}>
                    {q.badge}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{q.desc}</div>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
