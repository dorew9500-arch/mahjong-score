"use client";
import { useState, useMemo, useCallback } from "react";
import { Tile, tileFromId, sameTile } from "@/lib/tiles";
import { calculate, CalcOptions, CalcResult, OpenMentsu } from "@/lib/calculate";
import { freeRule, RuleSet } from "@/lib/rules";
import { TileSelector } from "@/components/TileSelector";
import { HandDisplay } from "@/components/HandDisplay";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ScoreResult } from "@/components/ScoreResult";
import { OpenMentsuPanel } from "@/components/OpenMentsuPanel";

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

  // 副露があると門前牌の上限が変わる（槓でも1組=3枚分。4枚目は嶺上牌で補充）
  const closedMax = 14 - openMentsu.length * 3;

  const handleOpenMentsuChange = useCallback((next: OpenMentsu[]) => {
    setOpenMentsu(next);
    const nextMax = 14 - next.length * 3;
    setTiles((prev) => prev.slice(0, nextMax));
  }, []);

  const addTile = useCallback((tile: Tile) => {
    setTiles((prev) => {
      if (prev.length >= closedMax) return prev;
      // 同一牌は手牌＋副露合わせて最大4枚
      const countInOpen = openMentsu.flatMap((m) => m.tiles).filter((t) => sameTile(t, tile)).length;
      const countInHand = prev.filter((t) => sameTile(t, tile)).length;
      if (countInOpen + countInHand >= 4) return prev;
      return [...prev, tile];
    });
  }, [closedMax, openMentsu]);

  const removeTile = useCallback((index: number) => {
    setTiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setTiles([]);
    setOpenMentsu([]);
  }, []);

  // アガリ牌は常に最後の門前牌
  const calcOptions: CalcOptions = useMemo(() => {
    const agariTile = tiles.length > 0 ? tiles[tiles.length - 1] : tileFromId("man1");
    return { ...options, agariTile, openMentsu };
  }, [tiles, options, openMentsu]);

  // 門前牌が揃ったら自動計算
  const result: CalcResult | null = useMemo(() => {
    if (tiles.length !== closedMax) return null;
    return calculate(tiles, calcOptions, rules);
  }, [tiles, closedMax, calcOptions, rules]);

  const isDealer = options.jikaze === 1;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px 80px" }}>
      {/* ヘッダー */}
      <div style={{ padding: "16px 0 12px", textAlign: "center" }}>
        <h1 style={{
          fontSize: "1.25rem", fontWeight: "bold",
          color: "var(--accent)", margin: 0,
        }}>
          🀄 麻雀点数計算
        </h1>
      </div>

      {/* 手牌表示 */}
      <div style={{ marginBottom: 10 }}>
        <HandDisplay tiles={tiles} openMentsu={openMentsu} onRemove={removeTile} onReset={reset} />
      </div>

      {/* 計算結果（14枚揃ったら表示） */}
      {result && (
        <div style={{ marginBottom: 10 }}>
          <ScoreResult result={result} isDealer={isDealer} isTsumo={options.isTsumo} />
        </div>
      )}

      {/* 待機メッセージ */}
      {tiles.length < closedMax && (
        <div style={{
          textAlign: "center", padding: "12px 0",
          fontSize: "0.875rem", color: "var(--text-muted)",
        }}>
          あと {closedMax - tiles.length} 枚選んでください
        </div>
      )}

      {/* 牌選択 */}
      <div style={{ marginBottom: 10 }}>
        <TileSelector rules={rules} handCount={tiles.length} max={closedMax} onAdd={addTile} />
      </div>

      {/* 副露（鳴き） */}
      <div style={{ marginBottom: 10 }}>
        <OpenMentsuPanel openMentsu={openMentsu} onChange={handleOpenMentsuChange} />
      </div>

      {/* 設定 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: "0.75rem", color: "var(--text-muted)",
          marginBottom: 6, fontWeight: "bold", letterSpacing: "0.05em",
        }}>
          設定
        </div>
        <SettingsPanel options={options} rules={rules} onChange={setOptions} />
      </div>
    </div>
  );
}
