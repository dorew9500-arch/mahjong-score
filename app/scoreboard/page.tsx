"use client";
import { useState, useEffect, useCallback } from "react";

interface GameState {
  players: string[];
  startScore: number;
  rounds: number[][];  // rounds[i][j] = プレイヤーjのi局の点数変動
}

const DEFAULT_PLAYERS = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"];
const DEFAULT_START   = 25000;
const STORAGE_KEY     = "mahjong-scoreboard";

function loadState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function calcTotals(startScore: number, rounds: number[][]): number[] {
  const totals = [startScore, startScore, startScore, startScore];
  for (const round of rounds) {
    for (let i = 0; i < 4; i++) totals[i] += round[i] ?? 0;
  }
  return totals;
}

export default function ScoreboardPage() {
  const [game, setGame] = useState<GameState>({
    players: DEFAULT_PLAYERS,
    startScore: DEFAULT_START,
    rounds: [],
  });

  // ローカルストレージから復元
  useEffect(() => {
    const saved = loadState();
    if (saved) setGame(saved);
  }, []);

  // 保存
  const update = useCallback((next: GameState) => {
    setGame(next);
    saveState(next);
  }, []);

  // 新しい局の入力フォーム
  const [draft, setDraft] = useState<string[]>(["", "", "", ""]);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editNameVal, setEditNameVal] = useState("");
  const [editingStart, setEditingStart] = useState(false);
  const [startVal, setStartVal] = useState(String(game.startScore));

  const totals = calcTotals(game.startScore, game.rounds);
  const ranked = [...totals.map((s, i) => ({ i, s }))]
    .sort((a, b) => b.s - a.s);

  function addRound() {
    const scores = draft.map((v) => {
      const n = parseInt(v.replace(/[^-0-9]/g, ""), 10);
      return isNaN(n) ? 0 : n;
    });
    // 合計が0になるよう4人目を自動計算するか、そのまま登録
    const next = { ...game, rounds: [...game.rounds, scores] };
    update(next);
    setDraft(["", "", "", ""]);
  }

  function removeRound(idx: number) {
    const next = { ...game, rounds: game.rounds.filter((_, i) => i !== idx) };
    update(next);
  }

  function reset() {
    const next: GameState = {
      players: game.players,
      startScore: game.startScore,
      rounds: [],
    };
    update(next);
  }

  function confirmReset() {
    if (confirm("スコアをすべてリセットしますか？")) reset();
  }

  function saveName(idx: number) {
    const players = [...game.players];
    players[idx] = editNameVal || DEFAULT_PLAYERS[idx];
    update({ ...game, players });
    setEditingName(null);
  }

  function saveStart() {
    const n = parseInt(startVal.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n)) update({ ...game, startScore: n });
    setEditingStart(false);
  }

  const rankColors = ["#d4a843", "#a0c4b0", "#cd7f32", "#888"];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 12px 80px" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
          スコア表
        </h1>
        <button className="btn-ghost" onClick={confirmReset}
          style={{ fontSize: "0.75rem", color: "#e74c3c", borderColor: "#e74c3c" }}>
          リセット
        </button>
      </div>

      {/* 初期点数 */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>初期持ち点</span>
        {editingStart ? (
          <>
            <input
              type="number"
              value={startVal}
              onChange={(e) => setStartVal(e.target.value)}
              style={{
                width: 90, padding: "4px 8px", borderRadius: 6,
                background: "var(--bg)", border: "1px solid var(--accent)",
                color: "var(--text)", fontSize: "0.875rem",
              }}
              autoFocus
            />
            <button className="btn-ghost" style={{ fontSize: "0.75rem" }} onClick={saveStart}>確定</button>
          </>
        ) : (
          <button className="btn-ghost" style={{ fontSize: "0.875rem" }}
            onClick={() => { setStartVal(String(game.startScore)); setEditingStart(true); }}>
            {game.startScore.toLocaleString()}点
          </button>
        )}
      </div>

      {/* 順位表 */}
      <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold" }}>
          現在の順位
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ranked.map(({ i, s }, rank) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: "0.7rem", fontWeight: "bold",
                color: rankColors[rank], minWidth: 20,
              }}>
                {rank + 1}位
              </span>
              <span style={{ fontSize: "0.875rem", flex: 1 }}>{game.players[i]}</span>
              <span style={{
                fontWeight: "bold", fontSize: "1rem",
                color: s > game.startScore ? "var(--accent)" : s < game.startScore ? "#e74c3c" : "var(--text)",
              }}>
                {s.toLocaleString()}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", minWidth: 56, textAlign: "right" }}>
                ({s > game.startScore ? "+" : ""}{(s - game.startScore).toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 局ごとのスコア入力 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>
          局を追加
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {game.players.map((name, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center" }}>
                {name.length > 5 ? name.slice(0, 5) + "…" : name}
              </div>
              <input
                type="number"
                value={draft[i]}
                onChange={(e) => {
                  const d = [...draft];
                  d[i] = e.target.value;
                  setDraft(d);
                }}
                placeholder="±点"
                style={{
                  width: "100%", padding: "6px 4px",
                  borderRadius: 6, border: "1px solid var(--border)",
                  background: "var(--bg)", color: "var(--text)",
                  fontSize: "0.875rem", textAlign: "center",
                }}
              />
            </div>
          ))}
        </div>
        <button className="btn-accent" style={{ width: "100%" }} onClick={addRound}>
          追加
        </button>
      </div>

      {/* 履歴テーブル */}
      {game.rounds.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>
            対局履歴
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "4px 6px", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>局</th>
                {game.players.map((name, i) => (
                  <th
                    key={i}
                    style={{ padding: "4px 6px", textAlign: "right", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => { setEditingName(i); setEditNameVal(name); }}
                    title="タップで名前を編集"
                  >
                    {editingName === i ? (
                      <input
                        autoFocus
                        value={editNameVal}
                        onChange={(e) => setEditNameVal(e.target.value)}
                        onBlur={() => saveName(i)}
                        onKeyDown={(e) => e.key === "Enter" && saveName(i)}
                        style={{
                          width: 60, padding: "2px 4px", borderRadius: 4,
                          background: "var(--bg)", border: "1px solid var(--accent)",
                          color: "var(--text)", fontSize: "0.75rem",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span>{name.length > 5 ? name.slice(0, 5) + "…" : name} ✎</span>
                    )}
                  </th>
                ))}
                <th style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}></th>
              </tr>
            </thead>
            <tbody>
              {game.rounds.map((round, ri) => (
                <tr key={ri}>
                  <td style={{ padding: "4px 6px", color: "var(--text-muted)" }}>{ri + 1}</td>
                  {round.map((score, pi) => (
                    <td key={pi} style={{
                      padding: "4px 6px", textAlign: "right",
                      color: score > 0 ? "var(--accent)" : score < 0 ? "#e74c3c" : "var(--text-muted)",
                      fontWeight: score !== 0 ? "bold" : "normal",
                    }}>
                      {score > 0 ? "+" : ""}{score.toLocaleString()}
                    </td>
                  ))}
                  <td style={{ padding: "4px 2px", textAlign: "center" }}>
                    <button
                      onClick={() => removeRound(ri)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem" }}
                    >×</button>
                  </td>
                </tr>
              ))}
              {/* 合計行 */}
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "6px 6px", fontWeight: "bold", color: "var(--text-muted)" }}>合計</td>
                {totals.map((t, i) => (
                  <td key={i} style={{
                    padding: "6px 6px", textAlign: "right", fontWeight: "bold", fontSize: "0.9rem",
                    color: t > game.startScore ? "var(--accent)" : t < game.startScore ? "#e74c3c" : "var(--text)",
                  }}>
                    {t.toLocaleString()}
                  </td>
                ))}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {game.rounds.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          局を追加するとここに履歴が表示されます
        </div>
      )}
    </div>
  );
}
