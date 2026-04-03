"use client";
import { useState, useEffect, useCallback } from "react";

// ===== 型 =====

interface HanchanResult {
  scores: number[];
  ranks: number[];  // [1位のplayerIdx, 2位, 3位, 4位]
}

interface GameState {
  players: string[];
  startScore: number;
  returnScore: number;
  uma: [number, number, number, number];
  rate: number;
  hanchan: HanchanResult[];
}

const DEFAULT_STATE: GameState = {
  players: ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"],
  startScore: 25000,
  returnScore: 30000,
  uma: [0, 0, 0, 0],
  rate: 0,
  hanchan: [],
};

const UMA_PRESETS: { label: string; value: [number, number, number, number] }[] = [
  { label: "なし",   value: [0,  0,   0,   0]  },
  { label: "5-10",  value: [10, 5,  -5,  -10] },
  { label: "10-20", value: [20, 10, -10, -20] },
  { label: "10-30", value: [30, 10, -10, -30] },
  { label: "20-40", value: [40, 20, -20, -40] },
];

const RATE_PRESETS = [0, 1, 5, 10, 50, 100];
const STORAGE_KEY = "mahjong-scoreboard-v4";
const RANK_COLORS = ["#e8c040", "#a0c4b0", "#cd7f32", "#888"];

// ===== ストレージ =====

function loadState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : null;
  } catch { return null; }
}
function saveState(s: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ===== 計算 =====

interface PlayerChip {
  playerIdx: number;
  rawChip: number;
  oka: number;
  uma: number;
  chip: number;
  money: number;
}

function calcChips(result: HanchanResult, game: GameState): PlayerChip[] {
  const oka = (game.returnScore - game.startScore) * 4 / 1000;
  return result.ranks.map((playerIdx, rank) => {
    const rawChip = (result.scores[playerIdx] - game.returnScore) / 1000;
    const okaBonus = rank === 0 ? oka : 0;
    const umaBonus = game.uma[rank];
    const chip = Math.round((rawChip + okaBonus + umaBonus) * 10) / 10;
    return { playerIdx, rawChip, oka: okaBonus, uma: umaBonus, chip, money: chip * game.rate };
  });
}

function calcTotals(game: GameState): number[] {
  const totals = Array(4).fill(0) as number[];
  for (const h of game.hanchan) {
    for (const c of calcChips(h, game)) {
      totals[c.playerIdx] = Math.round((totals[c.playerIdx] + c.chip) * 10) / 10;
    }
  }
  return totals;
}

// 同点になっているrank位置のセット
function tiedPositions(scores: number[], ranks: number[]): Set<number> {
  const tied = new Set<number>();
  for (let i = 0; i < ranks.length - 1; i++) {
    if (scores[ranks[i]] === scores[ranks[i + 1]]) tied.add(i);
  }
  return tied;
}

// ===== スタイル =====

const inputStyle: React.CSSProperties = {
  padding: "5px 8px", borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg)", color: "var(--text)",
  fontSize: "0.85rem", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 4,
};

// ===== メイン =====

export default function ScoreboardPage() {
  const [game, setGame] = useState<GameState>(DEFAULT_STATE);
  const [draft, setDraft] = useState(["", "", "", ""]);
  const [showSettings, setShowSettings] = useState(false);
  const [umaDraft, setUmaDraft] = useState(["", "", "", ""]);
  const [umaEditing, setUmaEditing] = useState(false);

  // 同点調整用
  const [pendingScores, setPendingScores] = useState<number[] | null>(null);
  const [pendingRanks, setPendingRanks] = useState<number[]>([]);

  useEffect(() => {
    const saved = loadState();
    if (saved) setGame(saved);
  }, []);

  const update = useCallback((next: GameState) => {
    setGame(next);
    saveState(next);
  }, []);

  const hasUma = game.uma.some((u) => u !== 0);
  const hasRate = game.rate > 0;
  const oka = (game.returnScore - game.startScore) * 4 / 1000;
  const umaMatch = UMA_PRESETS.find((p) => p.value.every((v, i) => v === game.uma[i]));
  const totals = calcTotals(game);
  const sortedTotals = totals
    .map((chip, i) => ({ i, chip }))
    .sort((a, b) => b.chip - a.chip);

  // 精算ボタン
  function handleSettle() {
    const scores = draft.map((v) => { const n = parseInt(v); return isNaN(n) ? game.startScore : n; });
    const sorted = scores
      .map((score, i) => ({ i, score }))
      .sort((a, b) => b.score - a.score);
    const ranks = sorted.map((s) => s.i);
    const tied = tiedPositions(scores, ranks);
    setPendingScores(scores);
    setPendingRanks(ranks);
    if (tied.size === 0) {
      // 同点なし→即確定
      confirmHanchan(scores, ranks);
    }
    // 同点あり→調整UIを表示
  }

  function confirmHanchan(scores: number[], ranks: number[]) {
    update({ ...game, hanchan: [...game.hanchan, { scores, ranks }] });
    setDraft(["", "", "", ""]);
    setPendingScores(null);
    setPendingRanks([]);
  }

  function swapRank(pos: number) {
    const r = [...pendingRanks];
    [r[pos], r[pos + 1]] = [r[pos + 1], r[pos]];
    setPendingRanks(r);
  }

  function applyUmaDraft() {
    const vals = umaDraft.map((v) => parseInt(v));
    if (vals.some(isNaN)) return;
    update({ ...game, uma: vals as [number, number, number, number] });
    setUmaEditing(false);
  }

  const tied = pendingScores ? tiedPositions(pendingScores, pendingRanks) : new Set<number>();
  const hasTie = tied.size > 0;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 12px 80px" }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>スコア表</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`btn-ghost${showSettings ? " active" : ""}`} style={{ fontSize: "0.75rem" }}
            onClick={() => setShowSettings(!showSettings)}>設定</button>
          <button className="btn-ghost" style={{ fontSize: "0.75rem", color: "#e74c3c", borderColor: "#e74c3c" }}
            onClick={() => { if (confirm("全記録をリセットしますか？")) update({ ...game, hanchan: [] }); }}>
            リセット
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 12, fontWeight: "bold" }}>設定</div>

          {/* プレイヤー名 */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>プレイヤー名</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {game.players.map((name, i) => (
                <input key={i} value={name}
                  onChange={(e) => { const p = [...game.players]; p[i] = e.target.value; update({ ...game, players: p }); }}
                  onBlur={(e) => { if (!e.target.value.trim()) { const p = [...game.players]; p[i] = `プレイヤー${i + 1}`; update({ ...game, players: p }); } }}
                  style={inputStyle} placeholder={`プレイヤー${i + 1}`} />
              ))}
            </div>
          </div>

          {/* 初期持ち点・返し点 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div>
              <div style={labelStyle}>初期持ち点</div>
              <input type="number" defaultValue={game.startScore}
                onBlur={(e) => { const n = parseInt(e.target.value); if (!isNaN(n)) update({ ...game, startScore: n }); }}
                style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>
                返し点
                <span style={{ marginLeft: 6, fontWeight: "normal" }}>オカ {oka.toFixed(1)}</span>
              </div>
              <input type="number" defaultValue={game.returnScore}
                onBlur={(e) => { const n = parseInt(e.target.value); if (!isNaN(n)) update({ ...game, returnScore: n }); }}
                style={inputStyle} />
            </div>
          </div>

          {/* ウマ */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>ウマ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {UMA_PRESETS.map((p) => {
                const active = !umaEditing && p.value.every((v, i) => v === game.uma[i]);
                return (
                  <button key={p.label} className={`btn-ghost${active ? " active" : ""}`} style={{ fontSize: "0.8rem" }}
                    onClick={() => { update({ ...game, uma: p.value }); setUmaEditing(false); }}>{p.label}</button>
                );
              })}
              <button className={`btn-ghost${umaEditing ? " active" : ""}`} style={{ fontSize: "0.8rem" }}
                onClick={() => { setUmaEditing(!umaEditing); setUmaDraft(game.uma.map(String)); }}>手動</button>
            </div>
            {umaEditing && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                  {["1位", "2位", "3位", "4位"].map((label, i) => (
                    <div key={i}>
                      <div style={{ ...labelStyle, textAlign: "center" }}>{label}</div>
                      <input type="number" value={umaDraft[i]}
                        onChange={(e) => { const d = [...umaDraft]; d[i] = e.target.value; setUmaDraft(d); }}
                        style={{ ...inputStyle, textAlign: "center" }} placeholder="0" />
                    </div>
                  ))}
                </div>
                <button className="btn-accent" style={{ fontSize: "0.8rem", padding: "5px 14px" }} onClick={applyUmaDraft}>適用</button>
              </div>
            )}
          </div>

          {/* レート */}
          <div>
            <div style={labelStyle}>レート（円/千点）</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {RATE_PRESETS.map((r) => (
                <button key={r} className={`btn-ghost${game.rate === r ? " active" : ""}`} style={{ fontSize: "0.8rem" }}
                  onClick={() => update({ ...game, rate: r })}>{r === 0 ? "なし" : `${r}円`}</button>
              ))}
            </div>
            <input type="number" value={game.rate === 0 ? "" : game.rate}
              onChange={(e) => { const n = parseFloat(e.target.value); update({ ...game, rate: isNaN(n) ? 0 : n }); }}
              placeholder="手動入力（円）" style={inputStyle} />
          </div>
        </div>
      )}

      {/* 累計 */}
      {game.hanchan.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold" }}>
            累計（{game.hanchan.length}半荘）
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedTotals.map(({ i, chip }, rank) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: RANK_COLORS[rank], minWidth: 22 }}>
                  {rank + 1}位
                </span>
                <span style={{ fontSize: "0.875rem", flex: 1 }}>{game.players[i]}</span>
                <span style={{ fontWeight: "bold", fontSize: "1rem", color: chip > 0 ? "var(--accent)" : chip < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                  {chip > 0 ? "+" : ""}{chip.toFixed(1)}
                </span>
                {hasRate && (
                  <span style={{ fontSize: "0.8rem", color: chip * game.rate > 0 ? "var(--accent)" : chip * game.rate < 0 ? "#e74c3c" : "var(--text-muted)", minWidth: 60, textAlign: "right" }}>
                    {chip * game.rate > 0 ? "+" : ""}{Math.round(chip * game.rate).toLocaleString()}円
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 点数入力 */}
      {!pendingScores && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>
            {game.hanchan.length + 1}半荘目 終了時の持ち点を入力
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {game.players.map((name, i) => (
              <div key={i}>
                <div style={{ ...labelStyle, marginBottom: 4 }}>{name}</div>
                <input type="number" value={draft[i]}
                  onChange={(e) => { const d = [...draft]; d[i] = e.target.value; setDraft(d); }}
                  placeholder={game.startScore.toLocaleString()}
                  style={{ ...inputStyle, fontSize: "1rem", padding: "8px 10px" }} />
              </div>
            ))}
          </div>
          <button className="btn-accent" style={{ width: "100%", fontSize: "0.95rem", padding: "10px" }}
            onClick={handleSettle}>精算する</button>
        </div>
      )}

      {/* 同点調整UI */}
      {pendingScores && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 4, fontWeight: "bold" }}>
            {hasTie ? "同点があります。順位を確認・調整してください" : "順位を確認してください"}
          </div>
          {hasTie && (
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10 }}>
              ↕ ボタンで同点プレイヤーの順位を入れ替えられます
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            {pendingRanks.map((playerIdx, rank) => {
              const score = pendingScores[playerIdx];
              const canSwap = tied.has(rank);
              return (
                <div key={rank} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: RANK_COLORS[rank], minWidth: 24 }}>
                    {rank + 1}位
                  </span>
                  <span style={{ flex: 1, fontSize: "0.9rem" }}>{game.players[playerIdx]}</span>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    {score.toLocaleString()}点
                  </span>
                  {canSwap && (
                    <button onClick={() => swapRank(rank)}
                      style={{ background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "var(--accent)", fontSize: "0.85rem" }}>
                      ↕
                    </button>
                  )}
                  {!canSwap && <span style={{ width: 38 }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-accent" style={{ flex: 1 }}
              onClick={() => confirmHanchan(pendingScores, pendingRanks)}>この順位で確定</button>
            <button className="btn-ghost" style={{ flex: 1 }}
              onClick={() => { setPendingScores(null); setPendingRanks([]); }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 半荘履歴 */}
      {game.hanchan.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>半荘履歴</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: 300 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "4px 6px", textAlign: "left", color: "var(--text-muted)", fontWeight: "normal" }}>#</th>
                {game.players.map((name, i) => (
                  <th key={i} style={{ padding: "4px 6px", textAlign: "right", color: "var(--text-muted)", fontWeight: "normal" }}>
                    {name.length > 4 ? name.slice(0, 4) + "…" : name}
                  </th>
                ))}
                <th style={{ width: 24 }} />
              </tr>
            </thead>
            <tbody>
              {game.hanchan.map((h, hi) => {
                const chips = calcChips(h, game);
                // playerIdx → chip のマップ
                const chipMap = Object.fromEntries(chips.map((c) => [c.playerIdx, c.chip]));
                return (
                  <tr key={hi} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "5px 6px", color: "var(--text-muted)" }}>{hi + 1}</td>
                    {game.players.map((_, pi) => {
                      const score = h.scores[pi];
                      const chip = chipMap[pi];
                      const rank = h.ranks.indexOf(pi);
                      return (
                        <td key={pi} style={{ padding: "5px 6px", textAlign: "right" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{score.toLocaleString()}</div>
                          <div style={{ fontWeight: "bold", color: chip > 0 ? "var(--accent)" : chip < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                            <span style={{ fontSize: "0.6rem", color: RANK_COLORS[rank] }}>{rank + 1}位 </span>
                            {chip > 0 ? "+" : ""}{chip.toFixed(1)}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: "4px 2px", textAlign: "center" }}>
                      <button onClick={() => update({ ...game, hanchan: game.hanchan.filter((_, i) => i !== hi) })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem" }}>×</button>
                    </td>
                  </tr>
                );
              })}
              {/* 累計行 */}
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "6px", color: "var(--text-muted)", fontWeight: "bold" }}>計</td>
                {totals.map((chip, i) => (
                  <td key={i} style={{ padding: "6px", textAlign: "right", fontWeight: "bold", color: chip > 0 ? "var(--accent)" : chip < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                    {chip > 0 ? "+" : ""}{chip.toFixed(1)}
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
