"use client";
import { useState, useEffect, useCallback } from "react";

// ===== 型・定数 =====

interface GameState {
  players: string[];
  startScore: number;
  returnScore: number;              // 返し点
  uma: [number, number, number, number]; // 1位〜4位のウマ
  rate: number;                     // 円/千点（0=なし）
  rounds: number[][];
}

const DEFAULT_STATE: GameState = {
  players: ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"],
  startScore: 25000,
  returnScore: 30000,
  uma: [30, 10, -10, -30],
  rate: 0,
  rounds: [],
};

const UMA_PRESETS: { label: string; value: [number, number, number, number] }[] = [
  { label: "なし",   value: [0,  0,   0,   0]   },
  { label: "5-10",  value: [10, 5,  -5,  -10]  },
  { label: "10-20", value: [20, 10, -10, -20]  },
  { label: "10-30", value: [30, 10, -10, -30]  },
  { label: "20-40", value: [40, 20, -20, -40]  },
];

const RATE_PRESETS = [0, 1, 5, 10, 50, 100];
const STORAGE_KEY = "mahjong-scoreboard-v2";
const RANK_COLORS = ["#e8c040", "#a0c4b0", "#cd7f32", "#888"];

// ===== ローカルストレージ =====

function loadState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : null;
  } catch { return null; }
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ===== 計算 =====

function calcTotals(game: GameState): number[] {
  const totals = Array(4).fill(game.startScore) as number[];
  for (const round of game.rounds)
    for (let i = 0; i < 4; i++) totals[i] += round[i] ?? 0;
  return totals;
}

interface Settlement {
  playerIdx: number;
  name: string;
  total: number;
  rank: number;
  rawChip: number;   // 素点
  oka: number;       // オカ（1位のみ）
  uma: number;       // ウマ
  chip: number;      // 合計チップ
  money: number;     // 収支（rate > 0 の場合）
}

function calcSettlement(game: GameState): Settlement[] {
  const totals = calcTotals(game);
  const oka = (game.returnScore - game.startScore) * 4 / 1000;

  const sorted = totals
    .map((total, i) => ({ i, total }))
    .sort((a, b) => b.total - a.total);

  return sorted.map(({ i, total }, rank) => {
    const rawChip = (total - game.returnScore) / 1000;
    const okaBonus = rank === 0 ? oka : 0;
    const umaBonus = game.uma[rank];
    const chip = Math.round((rawChip + okaBonus + umaBonus) * 10) / 10;
    const money = chip * game.rate;
    return { playerIdx: i, name: game.players[i], total, rank, rawChip, oka: okaBonus, uma: umaBonus, chip, money };
  });
}

// ===== フォーム部品 =====

function NumInput({ label, value, onSave }: { label: string; value: number; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  if (editing) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input
        autoFocus type="number" value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { const n = parseInt(val); if (!isNaN(n)) onSave(n); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { const n = parseInt(val); if (!isNaN(n)) onSave(n); setEditing(false); } }}
        style={{ width: 80, padding: "3px 6px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--accent)", color: "var(--text)", fontSize: "0.85rem" }}
      />
    </span>
  );
  return (
    <button className="btn-ghost" style={{ fontSize: "0.85rem" }} onClick={() => { setVal(String(value)); setEditing(true); }}>
      {label}: {value.toLocaleString()}
    </button>
  );
}

// ===== メイン =====

export default function ScoreboardPage() {
  const [game, setGame] = useState<GameState>(DEFAULT_STATE);
  const [draft, setDraft] = useState(["", "", "", ""]);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editNameVal, setEditNameVal] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const saved = loadState();
    if (saved) setGame(saved);
  }, []);

  const update = useCallback((next: GameState) => {
    setGame(next);
    saveState(next);
  }, []);

  const totals = calcTotals(game);
  const ranked = [...totals.map((s, i) => ({ i, s }))].sort((a, b) => b.s - a.s);
  const settlement = calcSettlement(game);
  const hasUma = game.uma.some((u) => u !== 0);
  const hasRate = game.rate > 0;

  function addRound() {
    const scores = draft.map((v) => { const n = parseInt(v); return isNaN(n) ? 0 : n; });
    update({ ...game, rounds: [...game.rounds, scores] });
    setDraft(["", "", "", ""]);
  }

  function saveName(idx: number) {
    const players = [...game.players];
    players[idx] = editNameVal.trim() || `プレイヤー${idx + 1}`;
    update({ ...game, players });
    setEditingName(null);
  }

  const umaMatch = UMA_PRESETS.find((p) => p.value.every((v, i) => v === game.uma[i]));

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 12px 80px" }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>スコア表</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`btn-ghost${showSettings ? " active" : ""}`} style={{ fontSize: "0.75rem" }} onClick={() => setShowSettings(!showSettings)}>
            設定
          </button>
          <button className="btn-ghost" style={{ fontSize: "0.75rem", color: "#e74c3c", borderColor: "#e74c3c" }}
            onClick={() => { if (confirm("スコアをリセットしますか？")) update({ ...game, rounds: [] }); }}>
            リセット
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>設定</div>

          {/* 初期点数・返し点 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <NumInput label="初期持ち点" value={game.startScore} onSave={(n) => update({ ...game, startScore: n })} />
            <NumInput label="返し点" value={game.returnScore} onSave={(n) => update({ ...game, returnScore: n })} />
          </div>

          {/* ウマ */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>ウマ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {UMA_PRESETS.map((p) => {
                const active = p.value.every((v, i) => v === game.uma[i]);
                return (
                  <button key={p.label} className={`btn-ghost${active ? " active" : ""}`} style={{ fontSize: "0.8rem" }}
                    onClick={() => update({ ...game, uma: p.value })}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            {/* カスタム表示 */}
            {!umaMatch && (
              <div style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--accent)" }}>
                カスタム: {game.uma.map((v, i) => `${i + 1}位${v > 0 ? "+" : ""}${v}`).join(" / ")}
              </div>
            )}
          </div>

          {/* レート */}
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>レート（円/千点）</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {RATE_PRESETS.map((r) => (
                <button key={r} className={`btn-ghost${game.rate === r ? " active" : ""}`} style={{ fontSize: "0.8rem" }}
                  onClick={() => update({ ...game, rate: r })}>
                  {r === 0 ? "なし" : `${r}円`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 現在の順位 */}
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold" }}>現在の順位</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ranked.map(({ i, s }, rank) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: RANK_COLORS[rank], minWidth: 22 }}>
                {rank + 1}位
              </span>
              <span style={{ fontSize: "0.875rem", flex: 1 }}>{game.players[i]}</span>
              <span style={{ fontWeight: "bold", fontSize: "1rem", color: s >= game.startScore ? "var(--accent)" : "#e74c3c" }}>
                {s.toLocaleString()}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: 52, textAlign: "right" }}>
                ({s >= game.startScore ? "+" : ""}{(s - game.startScore).toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 精算結果（ウマまたはレートが設定されている場合） */}
      {(hasUma || hasRate) && (
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold" }}>
            精算結果
            {hasUma && <span style={{ marginLeft: 6, fontWeight: "normal" }}>ウマ {umaMatch?.label ?? "カスタム"}</span>}
            {hasRate && <span style={{ marginLeft: 6, fontWeight: "normal" }}>レート {game.rate}円</span>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "3px 4px", textAlign: "left", color: "var(--text-muted)", fontWeight: "normal" }}>名前</th>
                <th style={{ padding: "3px 4px", textAlign: "right", color: "var(--text-muted)", fontWeight: "normal" }}>素点</th>
                {hasUma && <th style={{ padding: "3px 4px", textAlign: "right", color: "var(--text-muted)", fontWeight: "normal" }}>ウマ</th>}
                <th style={{ padding: "3px 4px", textAlign: "right", color: "var(--text-muted)", fontWeight: "normal" }}>チップ</th>
                {hasRate && <th style={{ padding: "3px 4px", textAlign: "right", color: "var(--text-muted)", fontWeight: "normal" }}>収支</th>}
              </tr>
            </thead>
            <tbody>
              {settlement.map((s) => (
                <tr key={s.playerIdx} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "5px 4px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: RANK_COLORS[s.rank], fontWeight: "bold", fontSize: "0.65rem" }}>{s.rank + 1}位</span>
                    {s.name}
                  </td>
                  <td style={{ padding: "5px 4px", textAlign: "right", color: "var(--text-muted)" }}>
                    {s.rawChip > 0 ? "+" : ""}{s.rawChip.toFixed(1)}
                  </td>
                  {hasUma && (
                    <td style={{ padding: "5px 4px", textAlign: "right" }}>
                      <span style={{ color: s.uma > 0 ? "var(--accent)" : s.uma < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                        {s.uma > 0 ? "+" : ""}{s.uma}
                        {s.rank === 0 && s.oka !== 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}> +オカ{s.oka}</span>}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: "5px 4px", textAlign: "right", fontWeight: "bold" }}>
                    <span style={{ color: s.chip > 0 ? "var(--accent)" : s.chip < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                      {s.chip > 0 ? "+" : ""}{s.chip.toFixed(1)}
                    </span>
                  </td>
                  {hasRate && (
                    <td style={{ padding: "5px 4px", textAlign: "right", fontWeight: "bold" }}>
                      <span style={{ color: s.money > 0 ? "var(--accent)" : s.money < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                        {s.money > 0 ? "+" : ""}{Math.round(s.money).toLocaleString()}円
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 局を追加 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>局を追加</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {game.players.map((name, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center" }}>
                {name.length > 5 ? name.slice(0, 4) + "…" : name}
              </div>
              <input
                type="number" value={draft[i]}
                onChange={(e) => { const d = [...draft]; d[i] = e.target.value; setDraft(d); }}
                placeholder="±点"
                style={{ width: "100%", padding: "6px 4px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: "0.875rem", textAlign: "center" }}
              />
            </div>
          ))}
        </div>
        <button className="btn-accent" style={{ width: "100%" }} onClick={addRound}>追加</button>
      </div>

      {/* 対局履歴 */}
      {game.rounds.length > 0 ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>対局履歴</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "4px 6px", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>局</th>
                {game.players.map((name, i) => (
                  <th key={i} style={{ padding: "4px 6px", textAlign: "right", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => { setEditingName(i); setEditNameVal(name); }}>
                    {editingName === i ? (
                      <input autoFocus value={editNameVal}
                        onChange={(e) => setEditNameVal(e.target.value)}
                        onBlur={() => saveName(i)}
                        onKeyDown={(e) => e.key === "Enter" && saveName(i)}
                        style={{ width: 60, padding: "2px 4px", borderRadius: 4, background: "var(--bg)", border: "1px solid var(--accent)", color: "var(--text)", fontSize: "0.75rem" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : `${name.length > 4 ? name.slice(0, 4) + "…" : name} ✎`}
                  </th>
                ))}
                <th style={{ borderBottom: "1px solid var(--border)" }} />
              </tr>
            </thead>
            <tbody>
              {game.rounds.map((round, ri) => (
                <tr key={ri}>
                  <td style={{ padding: "4px 6px", color: "var(--text-muted)" }}>{ri + 1}</td>
                  {round.map((score, pi) => (
                    <td key={pi} style={{ padding: "4px 6px", textAlign: "right", color: score > 0 ? "var(--accent)" : score < 0 ? "#e74c3c" : "var(--text-muted)", fontWeight: score !== 0 ? "bold" : "normal" }}>
                      {score > 0 ? "+" : ""}{score.toLocaleString()}
                    </td>
                  ))}
                  <td style={{ padding: "4px 2px", textAlign: "center" }}>
                    <button onClick={() => update({ ...game, rounds: game.rounds.filter((_, i) => i !== ri) })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem" }}>×</button>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "6px", fontWeight: "bold", color: "var(--text-muted)" }}>合計</td>
                {totals.map((t, i) => (
                  <td key={i} style={{ padding: "6px", textAlign: "right", fontWeight: "bold", color: t >= game.startScore ? "var(--accent)" : "#e74c3c" }}>
                    {t.toLocaleString()}
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          局を追加するとここに履歴が表示されます
        </div>
      )}
    </div>
  );
}
