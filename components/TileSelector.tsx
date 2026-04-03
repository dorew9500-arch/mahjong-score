"use client";
import { Tile, ALL_TILES, tileFromId } from "@/lib/tiles";
import { RuleSet } from "@/lib/rules";
import { TileButton } from "./TileButton";

interface Props {
  rules: RuleSet;
  handCount: number;
  max?: number;
  onAdd: (tile: Tile) => void;
  validAgariIds?: Set<string> | null;
}

const SUIT_ORDER: { type: string; label: string; akaId?: string }[] = [
  { type: "man",   label: "萬子", akaId: "man5r" },
  { type: "pin",   label: "筒子", akaId: "pin5r" },
  { type: "sou",   label: "索子", akaId: "sou5r" },
  { type: "honor", label: "字牌" },
];

export function TileSelector({ rules, handCount, max = 14, onAdd, validAgariIds }: Props) {
  const disabled = handCount >= max;
  const isAgariPhase = validAgariIds != null;

  function isAgariBlocked(tile: Tile): boolean {
    if (!isAgariPhase) return false;
    const baseId = tile.isAka ? tile.id.slice(0, -1) : tile.id;
    return !validAgariIds!.has(baseId);
  }

  function tileDisabled(tile: Tile): boolean {
    if (disabled) return true;
    if (isAgariBlocked(tile)) return true;
    return false;
  }

  function tileBlackout(tile: Tile): boolean {
    return isAgariBlocked(tile);
  }

  return (
    <div className="card">
      {isAgariPhase && (
        <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginBottom: 8, fontWeight: "bold" }}>
          上がり牌を選んでください
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SUIT_ORDER.map(({ type, label, akaId }) => {
          const tiles = ALL_TILES.filter((t) => t.type === type);
          return (
            <div key={type}>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 5 }}>{label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {tiles.map((tile) => (
                  <TileButton key={tile.id} tile={tile} onClick={onAdd} disabled={tileDisabled(tile)} blackout={tileBlackout(tile)} />
                ))}
                {rules.akaDoraEnabled && akaId && (
                  <TileButton key={akaId} tile={tileFromId(akaId)} onClick={onAdd} disabled={tileDisabled(tileFromId(akaId))} blackout={tileBlackout(tileFromId(akaId))} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}>
        {handCount}/{max} 枚
      </div>
    </div>
  );
}
