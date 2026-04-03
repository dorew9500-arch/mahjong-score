"use client";
import { useState, useCallback } from "react";
import { Tile, ALL_TILES, tileFromId, sameTile } from "@/lib/tiles";
import { calculate, CalcOptions } from "@/lib/calculate";
import { freeRule } from "@/lib/rules";
import { TileButton } from "@/components/TileButton";

// ===== 手牌生成 =====

const SUITS = ["man", "pin", "sou"] as const;
type Suit = typeof SUITS[number];

function ri(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeTiles(suit: Suit, ...nums: number[]): Tile[] {
  return nums.map(n => tileFromId(`${suit}${n}`));
}

function tryGenerateHand(): { tiles: Tile[]; expectedWaits: string[] } | null {
  const tiles: Tile[] = [];
  let expectedWaits: string[] = [];

  function addMentsu() {
    const suit = SUITS[ri(0, 2)];
    if (Math.random() < 0.4) {
      const n = ri(1, 9);
      tiles.push(...makeTiles(suit, n, n, n));
    } else {
      const s = ri(1, 7);
      tiles.push(...makeTiles(suit, s, s + 1, s + 2));
    }
  }

  // 待ち牌が2枚になる待ち型のみ生成（両面・双碰）
  if (Math.random() < 0.5) { // 両面
    addMentsu(); addMentsu(); addMentsu();
    const jSuit = SUITS[ri(0, 2)], jn = ri(1, 9);
    tiles.push(...makeTiles(jSuit, jn, jn));
    const wSuit = SUITS[ri(0, 2)], ws = ri(2, 7);
    tiles.push(...makeTiles(wSuit, ws, ws + 1));
    expectedWaits = [`${wSuit}${ws - 1}`, `${wSuit}${ws + 2}`];
  } else { // 双碰
    addMentsu(); addMentsu(); addMentsu();
    const s1 = SUITS[ri(0, 2)], n1 = ri(1, 9);
    const s2 = SUITS[ri(0, 2)], n2 = ri(1, 9);
    tiles.push(...makeTiles(s1, n1, n1));
    tiles.push(...makeTiles(s2, n2, n2));
    // 同じ牌の双碰は無効
    const uniqueWaits = new Set([`${s1}${n1}`, `${s2}${n2}`]);
    if (uniqueWaits.size < 2) return null;
    expectedWaits = [...uniqueWaits];
  }

  if (tiles.length !== 13) return null;

  // 4枚超チェック
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const c = (counts.get(t.id) || 0) + 1;
    if (c > 4) return null;
    counts.set(t.id, c);
  }

  return { tiles, expectedWaits };
}

const BASE_OPTIONS: Omit<CalcOptions, "agariTile"> = {
  isTsumo: true, bakaze: 1, jikaze: 2,
  isRiichi: false, isIppatsu: false, isDoubleRiichi: false,
  isRinshan: false, isHaitei: false, isChangkan: false,
  isTenhou: false, isChiihou: false, isRenhou: false,
  isNagashiMangan: false, doraCount: 0, uraDoraCount: 0,
  akaDoraCount: 0, appliedCustomYaku: [],
};

function computeValidAgari(tiles: Tile[]): string[] {
  const valid: string[] = [];
  for (const c of ALL_TILES.filter(t => !t.isAka)) {
    if (tiles.filter(t => sameTile(t, c)).length >= 4) continue;
    try {
      const r = calculate([...tiles, c], { ...BASE_OPTIONS, agariTile: c }, freeRule);
      if (r && !r.error) valid.push(c.id);
    } catch { /* skip */ }
  }
  return valid;
}

const TYPE_ORDER: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3 };
const HONOR_ORDER: Record<string, number> = { east: 0, south: 1, west: 2, north: 3, haku: 4, hatsu: 5, chun: 6 };

function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    const d = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
    if (d !== 0) return d;
    if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
    if (a.honor && b.honor) return (HONOR_ORDER[a.honor] ?? 9) - (HONOR_ORDER[b.honor] ?? 9);
    return 0;
  });
}

function generateQuiz(): { hand: Tile[]; answers: string[] } {
  for (let i = 0; i < 500; i++) {
    const result = tryGenerateHand();
    if (!result) continue;
    const answers = computeValidAgari(result.tiles);
    // 計算結果が意図した待ちと完全一致する場合のみ採用
    const expectedSet = new Set(result.expectedWaits);
    if (answers.length === expectedSet.size && answers.every(a => expectedSet.has(a))) {
      return { hand: sortTiles(result.tiles), answers };
    }
  }
  // フォールバック：確実な両面待ち手牌
  const fallbackTiles = [
    ...makeTiles("man", 1, 2, 3),
    ...makeTiles("man", 4, 5, 6),
    ...makeTiles("man", 7, 8, 9),
    ...makeTiles("pin", 1, 1),
    ...makeTiles("sou", 2, 3),
  ];
  return { hand: sortTiles(fallbackTiles), answers: computeValidAgari(fallbackTiles) };
}

// ===== UI =====

const SUIT_ROWS = [
  { type: "man",   tiles: ALL_TILES.filter(t => t.type === "man"  && !t.isAka) },
  { type: "pin",   tiles: ALL_TILES.filter(t => t.type === "pin"  && !t.isAka) },
  { type: "sou",   tiles: ALL_TILES.filter(t => t.type === "sou"  && !t.isAka) },
  { type: "honor", tiles: ALL_TILES.filter(t => t.type === "honor"             ) },
];

type Phase = "playing" | "answered";

export default function WaitQuizPage() {
  const [quiz, setQuiz] = useState(() => generateQuiz());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("playing");
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);

  const answerSet = new Set(quiz.answers);

  const toggle = useCallback((tile: Tile) => {
    if (phase !== "playing") return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(tile.id) ? next.delete(tile.id) : next.add(tile.id);
      return next;
    });
  }, [phase]);

  const check = useCallback(() => {
    setPhase("answered");
    const allCorrect =
      selected.size === answerSet.size &&
      [...selected].every(id => answerSet.has(id));
    setStreak(prev => allCorrect ? prev + 1 : 0);
    setTotal(prev => prev + 1);
  }, [selected, answerSet]);

  const next = useCallback(() => {
    setQuiz(generateQuiz());
    setSelected(new Set());
    setPhase("playing");
  }, []);

  // 答え合わせ結果
  const correctSelected = [...selected].filter(id => answerSet.has(id)).length;
  const wrongSelected   = [...selected].filter(id => !answerSet.has(id)).length;
  const missed          = quiz.answers.filter(id => !selected.has(id));
  const isAllCorrect    = selected.size === answerSet.size && wrongSelected === 0;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px 80px" }}>
      {/* ヘッダー */}
      <div style={{ padding: "12px 0 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
          待ちクイズ（初心者用）
        </h1>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {total > 0 && `連続正解: ${streak} / ${total}問`}
        </div>
      </div>

      {/* 手牌 */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: "bold", marginBottom: 8 }}>
          この手牌の上がり牌は？
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {quiz.hand.map((tile, i) => (
            <TileButton key={i} tile={tile} onClick={() => {}} size="sm" displayOnly />
          ))}
        </div>
      </div>

      {/* 結果表示 */}
      {phase === "answered" && (
        <div className="card" style={{
          marginBottom: 10,
          borderColor: isAllCorrect ? "#4ad47a" : "#e74c3c",
        }}>
          <div style={{
            fontSize: "1.1rem", fontWeight: "bold", marginBottom: 8,
            color: isAllCorrect ? "#4ad47a" : "#e74c3c",
          }}>
            {isAllCorrect ? "✓ 正解！" : "✗ 不正解"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>
            正解の待ち牌：
          </div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {quiz.answers.map(id => (
              <TileButton key={id} tile={tileFromId(id)} onClick={() => {}} size="sm" displayOnly />
            ))}
          </div>
          <button
            onClick={next}
            style={{
              marginTop: 12, width: "100%",
              background: "var(--accent)", color: "#1a1a1a",
              border: "none", borderRadius: 8, padding: "10px",
              fontSize: "0.9rem", fontWeight: "bold", cursor: "pointer",
            }}>
            次の問題 →
          </button>
        </div>
      )}

      {/* 牌選択エリア */}
      <div className="card">
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 10 }}>
          {phase === "playing"
            ? `上がり牌をすべて選んでください（${selected.size}枚選択中）`
            : `選択: ${correctSelected}正解 / ${wrongSelected}不正解${missed.length > 0 ? ` / 見逃し${missed.length}枚` : ""}`
          }
        </div>

        {SUIT_ROWS.map(({ type, tiles }) => (
          <div key={type} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {tiles.map(tile => {
                const isSelected = selected.has(tile.id);
                const isCorrect  = answerSet.has(tile.id);
                const isMissed   = phase === "answered" && isCorrect && !isSelected;

                let borderColor = "transparent";
                if (phase === "playing" && isSelected) borderColor = "var(--accent)";
                if (phase === "answered") {
                  if (isSelected && isCorrect)  borderColor = "#4ad47a";
                  if (isSelected && !isCorrect) borderColor = "#e74c3c";
                  if (isMissed)                  borderColor = "#f1c40f";
                }

                return (
                  <div
                    key={tile.id}
                    style={{
                      border: `2px solid ${borderColor}`,
                      borderRadius: 5,
                      cursor: phase === "playing" ? "pointer" : "default",
                      opacity: phase === "answered" && !isSelected && !isMissed ? 0.3 : 1,
                    }}
                    onClick={() => toggle(tile)}
                  >
                    <TileButton tile={tile} onClick={() => {}} size="sm" displayOnly />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {phase === "playing" && (
          <button
            onClick={check}
            disabled={selected.size === 0}
            style={{
              marginTop: 8, width: "100%",
              background: selected.size > 0 ? "var(--accent)" : "var(--surface)",
              color: selected.size > 0 ? "#1a1a1a" : "var(--text-muted)",
              border: "none", borderRadius: 8, padding: "10px",
              fontSize: "0.9rem", fontWeight: "bold",
              cursor: selected.size > 0 ? "pointer" : "default",
            }}>
            答え合わせ
          </button>
        )}
      </div>
    </div>
  );
}
