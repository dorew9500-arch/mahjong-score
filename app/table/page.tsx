"use client";
import { useState } from "react";

// ===== 点数計算 =====

function roundUp100(n: number) {
  return Math.ceil(n / 100) * 100;
}

type Level = "" | "満貫" | "跳満" | "倍満" | "三倍満" | "役満";

function getBase(fu: number, han: number): { base: number; level: Level } {
  if (han >= 13) return { base: 8000, level: "役満" };
  if (han >= 11) return { base: 6000, level: "三倍満" };
  if (han >= 8)  return { base: 4000, level: "倍満" };
  if (han >= 6)  return { base: 3000, level: "跳満" };
  if (han >= 5)  return { base: 2000, level: "満貫" };
  const raw = fu * Math.pow(2, han + 2);
  if (raw >= 2000) return { base: 2000, level: "満貫" };
  return { base: raw, level: "" };
}

function calcRon(fu: number, han: number, isDealer: boolean) {
  const { base, level } = getBase(fu, han);
  const score = roundUp100(base * (isDealer ? 6 : 4));
  return { score, level };
}

function calcTsumo(fu: number, han: number, isDealer: boolean) {
  const { base, level } = getBase(fu, han);
  if (isDealer) {
    const each = roundUp100(base * 2);
    return { each, total: each * 3, level };
  } else {
    const fromDealer = roundUp100(base * 2);
    const fromOther  = roundUp100(base * 1);
    return { fromDealer, fromOther, total: fromDealer + fromOther * 2, level };
  }
}

// ===== 表データ定義 =====

const FU_ROWS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const HAN_COLS = [1, 2, 3, 4];

const SPECIAL_ROWS: { label: string; sublabel: string; han: number }[] = [
  { label: "満貫",   sublabel: "5翻〜",    han: 5  },
  { label: "跳満",   sublabel: "6〜7翻",   han: 6  },
  { label: "倍満",   sublabel: "8〜10翻",  han: 8  },
  { label: "三倍満", sublabel: "11〜12翻", han: 11 },
  { label: "役満",   sublabel: "13翻〜",   han: 13 },
];

const LEVEL_COLORS: Record<Level, string> = {
  "":      "var(--text)",
  "満貫":   "#e8c040",   // ゴールド
  "跳満":   "#f09040",   // オレンジ
  "倍満":   "#f05848",   // 赤オレンジ
  "三倍満": "#f03030",   // 赤
  "役満":   "#d040f0",   // 明るい紫
};

// ===== コンポーネント =====

export default function TablePage() {
  const [isDealer, setIsDealer] = useState(false);
  const [mode, setMode]         = useState<"ron" | "tsumo">("ron");

  const cellStyle = (level: Level): React.CSSProperties => ({
    textAlign: "right",
    padding: "6px 8px",
    fontSize: "0.8rem",
    fontWeight: level ? "bold" : "normal",
    color: LEVEL_COLORS[level] || "var(--text)",
    background: level ? "rgba(255,255,255,0.04)" : "transparent",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  });

  const headerStyle: React.CSSProperties = {
    padding: "8px",
    fontSize: "0.75rem",
    fontWeight: "bold",
    color: "var(--text-muted)",
    textAlign: "center",
    background: "var(--bg)",
    borderBottom: "2px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 1,
    whiteSpace: "nowrap",
  };

  const fuCellStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    background: "var(--bg)",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    left: 0,
    whiteSpace: "nowrap",
    textAlign: "center",
    minWidth: 44,
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* ヘッダー */}
      <div style={{ padding: "16px 16px 12px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
          点数早見表
        </h1>
      </div>

      {/* 切り替えボタン */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {([false, true] as const).map((dealer) => (
            <button
              key={String(dealer)}
              className={`btn-ghost${isDealer === dealer ? " active" : ""}`}
              onClick={() => setIsDealer(dealer)}
            >
              {dealer ? "親" : "子"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["ron", "tsumo"] as const).map((m) => (
            <button
              key={m}
              className={`btn-ghost${mode === m ? " active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "ron" ? "ロン" : "ツモ"}
            </button>
          ))}
        </div>
      </div>

      {/* ツモの凡例 */}
      {mode === "tsumo" && (
        <div style={{ padding: "0 16px 8px", fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
          {isDealer ? "全員から" : "親から / 子から"}
        </div>
      )}

      {/* 表 */}
      <div style={{ overflowX: "auto", padding: "0 0 4px" }}>
        <table style={{
          borderCollapse: "collapse",
          width: "100%",
          minWidth: 320,
        }}>
          <thead>
            <tr>
              <th style={{ ...headerStyle, left: 0, position: "sticky", zIndex: 2, minWidth: 44 }}>符</th>
              {HAN_COLS.map((h) => (
                <th key={h} style={headerStyle}>{h}翻</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 符×翻 の通常行 */}
            {FU_ROWS.map((fu) => (
              <tr key={fu}>
                <td style={fuCellStyle}>
                  {fu}
                  {fu === 25 && <div style={{ fontSize: "0.6rem", lineHeight: 1 }}>七対</div>}
                </td>
                {HAN_COLS.map((han) => {
                  if (mode === "ron") {
                    const { score, level } = calcRon(fu, han, isDealer);
                    // 25符1翻は存在しない（七対子は2翻以上）
                    if (fu === 25 && han === 1) {
                      return <td key={han} style={{ ...cellStyle(""), color: "var(--text-muted)" }}>—</td>;
                    }
                    return (
                      <td key={han} style={cellStyle(level)}>
                        {score.toLocaleString()}
                      </td>
                    );
                  } else {
                    if (fu === 25 && han === 1) {
                      return <td key={han} style={{ ...cellStyle(""), color: "var(--text-muted)" }}>—</td>;
                    }
                    const r = calcTsumo(fu, han, isDealer);
                    if (isDealer) {
                      const dr = r as ReturnType<typeof calcTsumo> & { each: number };
                      return (
                        <td key={han} style={cellStyle(r.level)}>
                          {dr.each.toLocaleString()}
                        </td>
                      );
                    } else {
                      const dr = r as { fromDealer: number; fromOther: number; total: number; level: Level };
                      return (
                        <td key={han} style={cellStyle(r.level)}>
                          <span style={{ color: "var(--accent-hover)" }}>{dr.fromDealer.toLocaleString()}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}> / </span>
                          <span>{dr.fromOther.toLocaleString()}</span>
                        </td>
                      );
                    }
                  }
                })}
              </tr>
            ))}

            {/* 区切り */}
            <tr>
              <td colSpan={5} style={{
                padding: "4px 8px",
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                background: "var(--bg)",
                borderBottom: "2px solid var(--border)",
                textAlign: "center",
              }}>
                ── 以下は符に関係なく固定 ──
              </td>
            </tr>

            {/* 満貫以上の特殊行 */}
            {SPECIAL_ROWS.map(({ label, sublabel, han }) => {
              const color = LEVEL_COLORS[label as Level];
              if (mode === "ron") {
                const { score } = calcRon(30, han, isDealer);
                return (
                  <tr key={label}>
                    <td style={{ ...fuCellStyle, color }}>
                      <div style={{ fontWeight: "bold" }}>{label}</div>
                      <div style={{ fontSize: "0.6rem" }}>{sublabel}</div>
                    </td>
                    <td colSpan={4} style={{ ...cellStyle(label as Level), textAlign: "center", fontSize: "1rem" }}>
                      {score.toLocaleString()} 点
                    </td>
                  </tr>
                );
              } else {
                const r = calcTsumo(30, han, isDealer);
                return (
                  <tr key={label}>
                    <td style={{ ...fuCellStyle, color }}>
                      <div style={{ fontWeight: "bold" }}>{label}</div>
                      <div style={{ fontSize: "0.6rem" }}>{sublabel}</div>
                    </td>
                    <td colSpan={4} style={{ ...cellStyle(label as Level), textAlign: "center", fontSize: "1rem" }}>
                      {isDealer
                        ? `${(r as { each: number }).each.toLocaleString()} all`
                        : (() => {
                            const dr = r as { fromDealer: number; fromOther: number };
                            return (
                              <>
                                <span style={{ color: "var(--accent-hover)" }}>{dr.fromDealer.toLocaleString()}</span>
                                <span style={{ color: "var(--text-muted)" }}> / </span>
                                {dr.fromOther.toLocaleString()}
                              </>
                            );
                          })()
                      }
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>

      {/* 注釈 */}
      <div style={{ padding: "12px 16px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
        {mode === "tsumo" && !isDealer && "ツモ（子）：親から / 子から の支払い額"}
        {mode === "tsumo" &&  isDealer && "ツモ（親）：各プレイヤーの支払い額"}
        {mode === "ron" && "ロン：上がった相手からの支払い額"}
      </div>
    </div>
  );
}
