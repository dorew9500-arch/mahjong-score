export default function EfficiencyPage() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
      <div style={{ padding: "16px 0 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
          牌効率
        </h1>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚧</div>
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>準備中</div>
        <div style={{ fontSize: "0.85rem" }}>
          13枚の手牌から切り牌を選ぶと、有効牌数を比較して
          <br />最善の一打を教えてくれるツールです。
          <br />近日公開予定。
        </div>
      </div>
    </div>
  );
}
