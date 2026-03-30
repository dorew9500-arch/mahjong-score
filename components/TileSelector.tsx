"use client";
import { useState } from "react";
import { Tile, ALL_TILES, AKA_DORA_TILES, tileFromId } from "@/lib/tiles";
import { RuleSet } from "@/lib/rules";
import { TileButton } from "./TileButton";

type Tab = "man" | "pin" | "sou" | "honor";

interface Props {
  rules: RuleSet;
  handCount: number;
  max?: number;
  onAdd: (tile: Tile) => void;
}

export function TileSelector({ rules, handCount, max = 14, onAdd }: Props) {
  const [tab, setTab] = useState<Tab>("man");
  const disabled = handCount >= max;

  const tabs: { key: Tab; label: string }[] = [
    { key: "man", label: "萬子" },
    { key: "pin", label: "筒子" },
    { key: "sou", label: "索子" },
    { key: "honor", label: "字牌" },
  ];

  const tiles = ALL_TILES.filter((t) => t.type === tab);

  // 赤ドラボタン（ルールON時、5萬・5筒・5索）
  const akaMap: Record<Tab, string | null> = {
    man: "man5r",
    pin: "pin5r",
    sou: "sou5r",
    honor: null,
  };
  const akaId = akaMap[tab];

  return (
    <div className="card">
      {/* タブ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`btn-ghost${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 牌ボタン */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tiles.map((tile) => (
          <TileButton
            key={tile.id}
            tile={tile}
            onClick={onAdd}
            disabled={disabled}
          />
        ))}
        {/* 赤ドラ */}
        {rules.akaDoraEnabled && akaId && (
          <TileButton
            key={akaId}
            tile={tileFromId(akaId)}
            onClick={onAdd}
            disabled={disabled}
          />
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}>
        {handCount}/{max} 枚
      </div>
    </div>
  );
}
