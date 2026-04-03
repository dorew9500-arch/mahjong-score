"use client";
import { useState, useMemo, useCallback } from "react";
import { Tile, tileFromId, sameTile, ALL_TILES } from "@/lib/tiles";
import { calculate, CalcOptions, CalcResult, OpenMentsu } from "@/lib/calculate";
import { freeRule, RuleSet } from "@/lib/rules";
import { TileSelector } from "@/components/TileSelector";
import { TileButton } from "@/components/TileButton";
import { HandDisplay } from "@/components/HandDisplay";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ScoreResult } from "@/components/ScoreResult";

const TYPE_ORDER: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3 };
const HONOR_ORDER: Record<string, number> = { east: 0, south: 1, west: 2, north: 3, haku: 4, hatsu: 5, chun: 6 };

function compareTile(a: Tile, b: Tile): number {
  const diff = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
  if (diff !== 0) return diff;
  if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
  if (a.honor && b.honor) return (HONOR_ORDER[a.honor] ?? 9) - (HONOR_ORDER[b.honor] ?? 9);
  return 0;
}

const DEFAULT_OPTIONS: CalcOptions = {
  agariTile: tileFromId("man1"),
  isTsumo: false,
  bakaze: 1,
  jikaze: 2,
  isRiichi: false,
  isIppatsu: false,
  isDoubleRiichi: false,
  isRinshan: false,
  isHaitei: false,
  isChangkan: false,
  isTenhou: false,
  isChiihou: false,
  isRenhou: false,
  isNagashiMangan: false,
  doraCount: 0,
  uraDoraCount: 0,
  akaDoraCount: 0,
  appliedCustomYaku: [],
};

export default function Home() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [options, setOptions] = useState<CalcOptions>(DEFAULT_OPTIONS);
  const [rules] = useState<RuleSet>(freeRule);
  const [openMentsu, setOpenMentsu] = useState<OpenMentsu[]>([]);

  // 副露の実際の牌枚数から上限を計算（チー/ポン=3枚、槓=4枚）
  const openTileCount = openMentsu.reduce((sum, m) => sum + m.tiles.length, 0);
  const closedMax = 14 - openTileCount;

  const handleOpenMentsuChange = useCallback((next: OpenMentsu[]) => {
    setOpenMentsu(next);
    const nextMax = 14 - next.reduce((sum, m) => sum + m.tiles.length, 0);
    setTiles((prev) => prev.slice(0, nextMax));
  }, []);

  const addTile = useCallback((tile: Tile) => {
    setTiles((prev) => {
      if (prev.length >= closedMax) return prev;
      // 同一牌は手牌＋副露合わせて最大4枚
      const countInOpen = openMentsu.flatMap((m) => m.tiles).filter((t) => sameTile(t, tile)).length;
      const countInHand = prev.filter((t) => sameTile(t, tile)).length;
      if (countInOpen + countInHand >= 4) return prev;
      const next = [...prev, tile];
      if (next.length <= 1) return next;
      const agari = next[next.length - 1];
      const body = next.slice(0, -1).sort(compareTile);
      return [...body, agari];
    });
  }, [closedMax, openMentsu]);

  const removeTile = useCallback((index: number) => {
    setTiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setTiles([]);
    setOpenMentsu([]);
  }, []);

  const reorderTiles = useCallback((next: Tile[]) => {
    setTiles((prev) => {
      // アガリ牌（最後の牌）は固定して保持
      if (prev.length === closedMax) return [...next, prev[prev.length - 1]];
      return next;
    });
  }, [closedMax]);

  // アガリ牌は常に最後の門前牌
  const calcOptions: CalcOptions = useMemo(() => {
    const agariTile = tiles.length > 0 ? tiles[tiles.length - 1] : tileFromId("man1");
    return { ...options, agariTile, openMentsu };
  }, [tiles, options, openMentsu]);

  // 13枚のとき、上がれる牌のIDセットを計算（直接計算でキャッシュ問題を回避）
  let validAgariIds: Set<string> | null = null;
  if (tiles.length === closedMax - 1) {
    const valid = new Set<string>();
    for (const candidate of ALL_TILES.filter((t) => !t.isAka)) {
      try {
        const countInOpen = openMentsu.flatMap((m) => m.tiles).filter((t) => sameTile(t, candidate)).length;
        const countInHand = tiles.filter((t) => sameTile(t, candidate)).length;
        if (countInOpen + countInHand >= 4) continue;
        const testOptions: CalcOptions = { ...options, agariTile: candidate, openMentsu, isTsumo: false };
        const r = calculate([...tiles, candidate], testOptions, rules);
        if (r !== null && !r.error) valid.add(candidate.id);
      } catch { /* 計算エラーは無視 */ }
    }
    validAgariIds = valid;
  }

  // 門前牌が揃ったら自動計算
  const result: CalcResult | null = useMemo(() => {
    if (tiles.length !== closedMax) return null;
    return calculate(tiles, calcOptions, rules);
  }, [tiles, closedMax, calcOptions, rules]);

  const [showDetail, setShowDetail] = useState(false);
  const isDealer = options.jikaze === 1;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px 80px" }}>
      {/* ヘッダー */}
      <div style={{ padding: "16px 0 12px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--accent)", margin: 0 }}>
          🀄 麻雀点数計算
        </h1>
      </div>

      {/* 手牌表示＋副露 */}
      <div style={{ marginBottom: 8 }}>
        <HandDisplay
          tiles={tiles.length === closedMax ? tiles.slice(0, -1) : tiles}
          openMentsu={openMentsu}
          onRemove={removeTile}
          onReset={reset}
          onReorder={reorderTiles}
          onOpenMentsuChange={handleOpenMentsuChange}
          showAgariMark={false}
        />
      </div>

      {/* アガリ牌表示（14枚選択後） */}
      {tiles.length === closedMax && (
        <div className="card" style={{ marginBottom: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: "bold", whiteSpace: "nowrap" }}>アガリ牌:</span>
          <TileButton tile={tiles[tiles.length - 1]} onClick={() => removeTile(tiles.length - 1)} size="sm" />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>（タップで変更）</span>
        </div>
      )}

      {/* クイック設定：ロン/ツモ・親/子 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 2px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[false, true].map((tsumo) => (
            <button key={String(tsumo)}
              className={`btn-ghost${options.isTsumo === tsumo ? " active" : ""}`}
              style={{ fontSize: "0.85rem", padding: "5px 12px" }}
              onClick={() => setOptions({ ...options, isTsumo: tsumo })}>
              {tsumo ? "ツモ" : "ロン"}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[true, false].map((dealer) => (
            <button key={String(dealer)}
              className={`btn-ghost${isDealer === dealer ? " active" : ""}`}
              style={{ fontSize: "0.85rem", padding: "5px 12px" }}
              onClick={() => setOptions({ ...options, jikaze: dealer ? 1 : 2 })}>
              {dealer ? "親" : "子"}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            className={`btn-ghost${showDetail ? " active" : ""}`}
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            onClick={() => setShowDetail(!showDetail)}>
            詳細設定
          </button>
        </div>
      </div>

      {/* 詳細設定（折りたたみ） */}
      {showDetail && (
        <div style={{ marginBottom: 10 }}>
          <SettingsPanel options={options} rules={rules} onChange={setOptions} />
        </div>
      )}

      {/* 計算結果 */}
      {result && (
        <div style={{ marginBottom: 10 }}>
          <ScoreResult result={result} isDealer={isDealer} isTsumo={options.isTsumo} />
        </div>
      )}

      {/* 牌選択 */}
      {tiles.length < closedMax && (
        validAgariIds !== null ? (
          /* テンパイ時: 有効な上がり牌のみ表示 */
          <div style={{ marginBottom: 10 }}>
            {validAgariIds.size === 0 ? (
              <div style={{ textAlign: "center", padding: "8px 0", fontSize: "0.8rem", color: "#e74c3c" }}>テンパイしていません</div>
            ) : (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {ALL_TILES.filter((t) => {
                  if (t.isAka && !rules.akaDoraEnabled) return false;
                  const baseId = t.isAka ? t.id.slice(0, -1) : t.id;
                  return validAgariIds!.has(baseId);
                }).map((t) => (
                  <TileButton key={t.id} tile={t} onClick={addTile} size="sm" />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 通常: 全牌表示 */
          <div style={{ marginBottom: 10 }}>
            {tiles.length < closedMax - 1 && (
              <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                手牌を入力してください（あと {closedMax - tiles.length} 枚）
              </div>
            )}
            <TileSelector rules={rules} handCount={tiles.length} max={closedMax} onAdd={addTile} validAgariIds={null} />
          </div>
        )
      )}

    </div>
  );
}
