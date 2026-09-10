"use client";
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";

// ===== 型 =====

// 半荘1回の記録。
// ★ scores は seats と同じ並び（seats[k] の人の素点が scores[k]）。
//   ranks は上位から順に playerIdx を並べたもの。
// ★ at / seats / uma / startScore / returnScore は後から足したので、
//   古い記録には入っていない。読むときは必ず既定値に落とす（下の seatsOf / settingsOf）。
//   これで、いま入っている記録を1件も壊さずに済む。
interface HanchanResult {
  scores: number[];
  ranks: number[];
  at?: number;          // 打った日時
  seats?: number[];     // 打った人の playerIdx。無ければ「登録順に全員が打った」
  uma?: number[];       // そのとき使ったウマ
  startScore?: number;  // そのときの開始点
  returnScore?: number; // そのときの返し点
}

interface GameState {
  players: string[];   // 登録メンバー（3〜6人）
  tableSize: number;   // 1卓の人数（3 or 4）
  startScore: number;
  returnScore: number;
  uma: number[];       // 長さは tableSize
  rate: number;
  hanchan: HanchanResult[];
}

const DEFAULT_STATE: GameState = {
  players: ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"],
  tableSize: 4,
  startScore: 25000,
  returnScore: 30000,
  uma: [0, 0, 0, 0],
  rate: 0,
  hanchan: [],
};

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;

// ウマは順位に対する値なので、卓の人数ぶんだけ要る。合計は0になる。
const UMA_PRESETS: Record<number, { label: string; value: number[] }[]> = {
  4: [
    { label: "なし",   value: [0,  0,   0,   0]  },
    { label: "5-10",  value: [10, 5,  -5,  -10] },
    { label: "10-20", value: [20, 10, -10, -20] },
    { label: "10-30", value: [30, 10, -10, -30] },
    { label: "20-40", value: [40, 20, -20, -40] },
  ],
  3: [
    { label: "なし",   value: [0,  0,  0]   },
    { label: "5-10",  value: [10, 5,  -15] },
    { label: "10-20", value: [20, 10, -30] },
    { label: "20-30", value: [30, 20, -50] },
  ],
};

const RATE_PRESETS = [0, 1, 5, 10, 50, 100];
const STORAGE_KEY = "mahjong-scoreboard-v4";
const RANK_COLORS = ["#e8c040", "#a0c4b0", "#cd7f32", "#888"];

// ===== 日付 =====

// ★1日の区切りは朝6時。深夜まで打つので、0時で切ると同じ卓が2日に割れる。
const DAY_BORDER_HOUR = 6;

function dayKeyOf(t: number): string {
  const d = new Date(t - DAY_BORDER_HOUR * 3600 * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function dayLabel(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(m)}/${Number(d)}`;
}
const todayKey = () => dayKeyOf(Date.now());

// ===== ストレージ =====

function loadState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = { ...DEFAULT_STATE, ...JSON.parse(raw) } as GameState;
    // 古い保存には tableSize が無い。4人打ちとして読む。
    if (!s.tableSize) s.tableSize = 4;
    if (!Array.isArray(s.uma) || s.uma.length !== s.tableSize) {
      s.uma = UMA_PRESETS[s.tableSize][0].value;
    }
    return s;
  } catch { return null; }
}
function saveState(s: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ===== 計算 =====

// その半荘を打った人。古い記録には入っていないので、素点の数だけ登録順に打ったとみなす。
function seatsOf(h: HanchanResult): number[] {
  return h.seats ?? h.scores.map((_, i) => i);
}

// その半荘の計算に使う設定。
// ★新しい記録は、打った時点の設定を焼き込んである。だから後で設定を変えても動かない。
//   古い記録は焼き込まれていないので、いまの設定で計算する（今までと同じ挙動）。
function settingsOf(h: HanchanResult, game: GameState) {
  return {
    uma: h.uma ?? game.uma,
    startScore: h.startScore ?? game.startScore,
    returnScore: h.returnScore ?? game.returnScore,
  };
}

interface PlayerChip {
  playerIdx: number;
  rawChip: number;
  oka: number;
  uma: number;
  chip: number;
}

function calcChips(h: HanchanResult, game: GameState): PlayerChip[] {
  const seats = seatsOf(h);
  const { uma, startScore, returnScore } = settingsOf(h, game);
  // オカは卓の人数ぶん集まる。3人打ちなら×3。
  const oka = (returnScore - startScore) * seats.length / 1000;
  return h.ranks.map((playerIdx, rank) => {
    const k = seats.indexOf(playerIdx);
    const score = k >= 0 ? h.scores[k] : returnScore;
    const rawChip = (score - returnScore) / 1000;
    const okaBonus = rank === 0 ? oka : 0;
    const umaBonus = uma[rank] ?? 0;
    const chip = Math.round((rawChip + okaBonus + umaBonus) * 10) / 10;
    return { playerIdx, rawChip, oka: okaBonus, uma: umaBonus, chip };
  });
}

// 累計と、打った半荘数。抜けた半荘は 0点ではなく「参加していない」扱いにする。
function calcTotals(hanchan: HanchanResult[], game: GameState) {
  const totals = Array(game.players.length).fill(0) as number[];
  const played = Array(game.players.length).fill(0) as number[];
  for (const h of hanchan) {
    for (const c of calcChips(h, game)) {
      if (c.playerIdx >= totals.length) continue;
      totals[c.playerIdx] = Math.round((totals[c.playerIdx] + c.chip) * 10) / 10;
      played[c.playerIdx] += 1;
    }
  }
  return { totals, played };
}

// 同点になっている rank 位置
function tiedPositions(scores: number[], ranks: number[], seats: number[]): Set<number> {
  const tied = new Set<number>();
  const scoreOf = (playerIdx: number) => scores[seats.indexOf(playerIdx)];
  for (let i = 0; i < ranks.length - 1; i++) {
    if (scoreOf(ranks[i]) === scoreOf(ranks[i + 1])) tied.add(i);
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
  const [draft, setDraft] = useState<string[]>(["", "", "", ""]);
  const [seatSel, setSeatSel] = useState<number[]>([0, 1, 2, 3]);
  const [showSettings, setShowSettings] = useState(false);
  const [umaDraft, setUmaDraft] = useState<string[]>([]);
  const [umaEditing, setUmaEditing] = useState(false);
  const [scope, setScope] = useState<"today" | "all">("today");

  // 同点調整用
  const [pendingScores, setPendingScores] = useState<number[] | null>(null);
  const [pendingRanks, setPendingRanks] = useState<number[]>([]);
  const [pendingSeats, setPendingSeats] = useState<number[]>([]);

  useEffect(() => {
    const saved = loadState();
    if (!saved) return;
    setGame(saved);
    // 今日の記録が無ければ、最初から全期間を見せる（空の画面を出さないため）
    const hasToday = saved.hanchan.some((h) => h.at && dayKeyOf(h.at) === todayKey());
    if (!hasToday && saved.hanchan.length > 0) setScope("all");
  }, []);

  const update = useCallback((next: GameState) => {
    setGame(next);
    saveState(next);
  }, []);

  const needSeatPick = game.players.length !== game.tableSize;
  const { totals: allTotals, played: allPlayed } = useMemo(
    () => calcTotals(game.hanchan, game), [game]
  );

  // 抜け番が偏らないよう、打った数が少ない人から自動で選んでおく。
  // 選び直せるので、これは「初期値」でしかない。
  useEffect(() => {
    const order = game.players
      .map((_, i) => ({ i, n: allPlayed[i] ?? 0 }))
      .sort((a, b) => (a.n - b.n) || (a.i - b.i))
      .slice(0, game.tableSize)
      .map((x) => x.i)
      .sort((a, b) => a - b);
    setSeatSel(order);
    setDraft(Array(game.tableSize).fill(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.tableSize, game.players.length, game.hanchan.length]);

  const shown = useMemo(() => {
    if (scope === "all") return game.hanchan;
    const k = todayKey();
    // 日付を持たない古い記録は「今日」には含めない
    return game.hanchan.filter((h) => h.at && dayKeyOf(h.at) === k);
  }, [game.hanchan, scope]);

  const { totals, played } = useMemo(() => calcTotals(shown, game), [shown, game]);

  const hasRate = game.rate > 0;
  const oka = (game.returnScore - game.startScore) * game.tableSize / 1000;
  const presets = UMA_PRESETS[game.tableSize] ?? UMA_PRESETS[4];
  const sortedTotals = totals
    .map((chip, i) => ({ i, chip }))
    .sort((a, b) => b.chip - a.chip);

  // 日付ごとに区切った履歴（新しい日が上）
  const byDay = useMemo(() => {
    const map = new Map<string, HanchanResult[]>();
    for (const h of shown) {
      const k = h.at ? dayKeyOf(h.at) : "（日付なし）";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(h);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [shown]);

  function toggleSeat(playerIdx: number) {
    if (seatSel.includes(playerIdx)) {
      if (seatSel.length <= game.tableSize) return; // 減らしすぎない
      setSeatSel(seatSel.filter((i) => i !== playerIdx));
      return;
    }
    // すでに卓の人数ぶん選んでいたら、いちばん古い選択を外して入れ替える
    const next = seatSel.length >= game.tableSize ? seatSel.slice(1) : seatSel;
    setSeatSel([...next, playerIdx].sort((a, b) => a - b));
  }

  function handleSettle() {
    if (seatSel.length !== game.tableSize) return;
    const scores = draft.map((v) => { const n = parseInt(v); return isNaN(n) ? game.startScore : n; });
    const ranks = scores
      .map((score, k) => ({ playerIdx: seatSel[k], score }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.playerIdx);
    const tied = tiedPositions(scores, ranks, seatSel);
    setPendingScores(scores);
    setPendingRanks(ranks);
    setPendingSeats([...seatSel]);
    if (tied.size === 0) confirmHanchan(scores, ranks, [...seatSel]);
  }

  function confirmHanchan(scores: number[], ranks: number[], seats: number[]) {
    // ★打った時点の設定を焼き込む。後でウマや返し点を変えても、この半荘は動かない。
    //   3人打ちと4人打ちを同じ日に混ぜても壊れないのは、これのおかげ。
    const rec: HanchanResult = {
      scores, ranks, seats,
      at: Date.now(),
      uma: [...game.uma],
      startScore: game.startScore,
      returnScore: game.returnScore,
    };
    update({ ...game, hanchan: [...game.hanchan, rec] });
    setDraft(Array(game.tableSize).fill(""));
    setPendingScores(null);
    setPendingRanks([]);
    setPendingSeats([]);
    if (scope === "all") setScope("all"); else setScope("today");
  }

  function swapRank(pos: number) {
    const r = [...pendingRanks];
    [r[pos], r[pos + 1]] = [r[pos + 1], r[pos]];
    setPendingRanks(r);
  }

  function applyUmaDraft() {
    const vals = umaDraft.map((v) => parseInt(v));
    if (vals.length !== game.tableSize || vals.some(isNaN)) return;
    update({ ...game, uma: vals });
    setUmaEditing(false);
  }

  function setTableSize(n: number) {
    // ウマは順位ぶんの値なので、人数が変わったら作り直す
    update({ ...game, tableSize: n, uma: (UMA_PRESETS[n] ?? UMA_PRESETS[4])[0].value });
    setUmaEditing(false);
  }

  function addPlayer() {
    if (game.players.length >= MAX_PLAYERS) return;
    update({ ...game, players: [...game.players, `プレイヤー${game.players.length + 1}`] });
  }
  function removePlayer(i: number) {
    if (game.players.length <= MIN_PLAYERS) return;
    if (allPlayed[i] > 0 && !confirm(`${game.players[i]} には ${allPlayed[i]} 半荘の記録があります。外すと記録の並びがずれます。続けますか？`)) return;
    update({ ...game, players: game.players.filter((_, k) => k !== i) });
  }

  function handleReset() {
    if (scope === "today") {
      const k = todayKey();
      const rest = game.hanchan.filter((h) => !(h.at && dayKeyOf(h.at) === k));
      if (rest.length === game.hanchan.length) { alert("今日の記録はありません。"); return; }
      if (confirm("今日の記録を消しますか？（他の日は残ります）")) update({ ...game, hanchan: rest });
    } else {
      if (confirm("全期間の記録を消しますか？　元に戻せません。")) update({ ...game, hanchan: [] });
    }
  }

  const tied = pendingScores ? tiedPositions(pendingScores, pendingRanks, pendingSeats) : new Set<number>();
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
            onClick={handleReset}>リセット</button>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 12, fontWeight: "bold" }}>設定</div>

          {/* 卓の人数 */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>1卓の人数</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[4, 3].map((n) => (
                <button key={n} className={`btn-ghost${game.tableSize === n ? " active" : ""}`}
                  style={{ fontSize: "0.8rem" }} onClick={() => setTableSize(n)}>
                  {n}人打ち
                </button>
              ))}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              変えるとウマが人数ぶんに作り直されます。すでに記録した半荘は、打ったときの設定のまま動きません。
            </div>
          </div>

          {/* メンバー */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>メンバー（{game.players.length}人）</span>
              <span>
                {game.players.length < MAX_PLAYERS && (
                  <button className="btn-ghost" style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                    onClick={addPlayer}>＋追加</button>
                )}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {game.players.map((name, i) => (
                <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input value={name}
                    onChange={(e) => { const p = [...game.players]; p[i] = e.target.value; update({ ...game, players: p }); }}
                    onBlur={(e) => { if (!e.target.value.trim()) { const p = [...game.players]; p[i] = `プレイヤー${i + 1}`; update({ ...game, players: p }); } }}
                    style={inputStyle} placeholder={`プレイヤー${i + 1}`} />
                  {game.players.length > MIN_PLAYERS && (
                    <button onClick={() => removePlayer(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem", padding: "0 2px" }}>×</button>
                  )}
                </div>
              ))}
            </div>
            {needSeatPick && (
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                メンバーが{game.players.length}人で{game.tableSize}人打ちなので、半荘ごとに打つ人を選びます。
              </div>
            )}
          </div>

          {/* 初期持ち点・返し点 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div>
              <div style={labelStyle}>初期持ち点</div>
              <input type="number" defaultValue={game.startScore} key={`s${game.startScore}`}
                onBlur={(e) => { const n = parseInt(e.target.value); if (!isNaN(n)) update({ ...game, startScore: n }); }}
                style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>
                返し点
                <span style={{ marginLeft: 6, fontWeight: "normal" }}>オカ {oka.toFixed(1)}</span>
              </div>
              <input type="number" defaultValue={game.returnScore} key={`r${game.returnScore}`}
                onBlur={(e) => { const n = parseInt(e.target.value); if (!isNaN(n)) update({ ...game, returnScore: n }); }}
                style={inputStyle} />
            </div>
          </div>

          {/* ウマ */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>ウマ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {presets.map((p) => {
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
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${game.tableSize}, 1fr)`, gap: 6, marginBottom: 8 }}>
                  {Array.from({ length: game.tableSize }, (_, i) => (
                    <div key={i}>
                      <div style={{ ...labelStyle, textAlign: "center" }}>{i + 1}位</div>
                      <input type="number" value={umaDraft[i] ?? ""}
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

      {/* 今日 / 全期間 */}
      {game.hanchan.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
          {(["today", "all"] as const).map((s) => (
            <button key={s} className={`btn-ghost${scope === s ? " active" : ""}`} style={{ fontSize: "0.8rem" }}
              onClick={() => setScope(s)}>{s === "today" ? "今日" : "全期間"}</button>
          ))}
          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginLeft: "auto", lineHeight: 1.4 }}>
            日付は朝{DAY_BORDER_HOUR}時で区切り
          </span>
        </div>
      )}

      {/* 累計 */}
      {shown.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold" }}>
            {scope === "today" ? "今日" : "全期間"}の累計（{shown.length}半荘）
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedTotals.map(({ i, chip }, rank) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: RANK_COLORS[rank] ?? "#888", minWidth: 22 }}>
                  {rank + 1}位
                </span>
                <span style={{ fontSize: "0.875rem", flex: 1 }}>
                  {game.players[i]}
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: 6 }}>
                    {played[i]}半荘
                  </span>
                </span>
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

      {/* 打つ人を選ぶ（メンバーと卓の人数が同じときは出さない） */}
      {!pendingScores && needSeatPick && (
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold" }}>
            この半荘を打つ人（{seatSel.length}/{game.tableSize}）
            <span style={{ fontWeight: "normal", marginLeft: 6 }}>打った数が少ない人を選んであります</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {game.players.map((name, i) => (
              <button key={i} className={`btn-ghost${seatSel.includes(i) ? " active" : ""}`}
                style={{ fontSize: "0.8rem" }} onClick={() => toggleSeat(i)}>
                {name}
                <span style={{ fontSize: "0.6rem", opacity: 0.7, marginLeft: 4 }}>{allPlayed[i] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 点数入力 */}
      {!pendingScores && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: "bold" }}>
            {shown.length + 1}半荘目 終了時の持ち点を入力
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {seatSel.map((playerIdx, k) => (
              <div key={playerIdx}>
                <div style={{ ...labelStyle, marginBottom: 4 }}>{game.players[playerIdx]}</div>
                <input type="number" value={draft[k] ?? ""}
                  onChange={(e) => { const d = [...draft]; d[k] = e.target.value; setDraft(d); }}
                  placeholder={game.startScore.toLocaleString()}
                  style={{ ...inputStyle, fontSize: "1rem", padding: "8px 10px" }} />
              </div>
            ))}
          </div>
          <button className="btn-accent" style={{ width: "100%", fontSize: "0.95rem", padding: "10px" }}
            onClick={handleSettle}>精算する</button>
        </div>
      )}

      {/* 同点調整 */}
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
              const score = pendingScores[pendingSeats.indexOf(playerIdx)];
              const canSwap = tied.has(rank);
              return (
                <div key={rank} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: RANK_COLORS[rank] ?? "#888", minWidth: 24 }}>
                    {rank + 1}位
                  </span>
                  <span style={{ flex: 1, fontSize: "0.9rem" }}>{game.players[playerIdx]}</span>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{score.toLocaleString()}点</span>
                  {canSwap ? (
                    <button onClick={() => swapRank(rank)}
                      style={{ background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "var(--accent)", fontSize: "0.85rem" }}>↕</button>
                  ) : <span style={{ width: 38 }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-accent" style={{ flex: 1 }}
              onClick={() => confirmHanchan(pendingScores, pendingRanks, pendingSeats)}>この順位で確定</button>
            <button className="btn-ghost" style={{ flex: 1 }}
              onClick={() => { setPendingScores(null); setPendingRanks([]); setPendingSeats([]); }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 半荘履歴 */}
      {shown.length > 0 && (
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
              {byDay.map(([key, list]) => (
                <Fragment key={key}>
                  {(scope === "all" || byDay.length > 1) && (
                    <tr>
                      <td colSpan={game.players.length + 2}
                        style={{ padding: "8px 6px 4px", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "bold" }}>
                        {key === "（日付なし）" ? key : dayLabel(key)}
                        <span style={{ fontWeight: "normal", marginLeft: 6 }}>{list.length}半荘</span>
                      </td>
                    </tr>
                  )}
                  {list.map((h) => {
                    const hi = game.hanchan.indexOf(h);
                    const seats = seatsOf(h);
                    const chipMap = Object.fromEntries(calcChips(h, game).map((c) => [c.playerIdx, c.chip]));
                    return (
                      <tr key={hi} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "5px 6px", color: "var(--text-muted)" }}>
                          {hi + 1}
                          {seats.length !== game.tableSize && (
                            <span style={{ fontSize: "0.6rem", marginLeft: 2 }}>({seats.length}人)</span>
                          )}
                        </td>
                        {game.players.map((_, pi) => {
                          const k = seats.indexOf(pi);
                          if (k < 0) {
                            // この半荘は抜け番。0点とは意味が違うので、空欄にする。
                            return <td key={pi} style={{ padding: "5px 6px", textAlign: "center", color: "var(--text-muted)", opacity: 0.4 }}>—</td>;
                          }
                          const chip = chipMap[pi];
                          const rank = h.ranks.indexOf(pi);
                          return (
                            <td key={pi} style={{ padding: "5px 6px", textAlign: "right" }}>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{h.scores[k].toLocaleString()}</div>
                              <div style={{ fontWeight: "bold", color: chip > 0 ? "var(--accent)" : chip < 0 ? "#e74c3c" : "var(--text-muted)" }}>
                                <span style={{ fontSize: "0.6rem", color: RANK_COLORS[rank] ?? "#888" }}>{rank + 1}位 </span>
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
                </Fragment>
              ))}
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
