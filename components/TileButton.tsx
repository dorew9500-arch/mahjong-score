"use client";
import { Tile } from "@/lib/tiles";
import Image from "next/image";

interface Props {
  tile: Tile;
  onClick: (tile: Tile) => void;
  disabled?: boolean;
  blackout?: boolean;
  size?: "sm" | "md";
  displayOnly?: boolean; // 表示専用：フル透明度、非インタラクティブ
}

// tile.id → 画像ファイル名マッピング
const TILE_IMAGE: Record<string, string> = {
  man1: "Man1", man2: "Man2", man3: "Man3", man4: "Man4", man5: "Man5",
  man6: "Man6", man7: "Man7", man8: "Man8", man9: "Man9", man5r: "Man5-Dora",
  pin1: "Pin1", pin2: "Pin2", pin3: "Pin3", pin4: "Pin4", pin5: "Pin5",
  pin6: "Pin6", pin7: "Pin7", pin8: "Pin8", pin9: "Pin9", pin5r: "Pin5-Dora",
  sou1: "Sou1", sou2: "Sou2", sou3: "Sou3", sou4: "Sou4", sou5: "Sou5",
  sou6: "Sou6", sou7: "Sou7", sou8: "Sou8", sou9: "Sou9", sou5r: "Sou5-Dora",
  east: "Ton", south: "Nan", west: "Shaa", north: "Pei",
  haku: "Haku", hatsu: "Hatsu", chun: "Chun",
};

export function TileButton({ tile, onClick, disabled, blackout, size = "md", displayOnly }: Props) {
  const imgSize = size === "sm" ? 24 : 28;

  const imgFile = TILE_IMAGE[tile.id];
  const src = blackout ? "/tiles/Back.png" : imgFile ? `/tiles/${imgFile}.png` : null;

  if (!src) return null;

  return (
    <button
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.25)",
        padding: 1,
        cursor: disabled || blackout || displayOnly ? "default" : "pointer",
        opacity: blackout ? 0.6 : disabled && !displayOnly ? 0.35 : 1,
        pointerEvents: blackout || displayOnly ? "none" : "auto",
        borderRadius: 4,
        display: "inline-flex",
        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
      }}
      onClick={() => !disabled && !blackout && !displayOnly && onClick(tile)}
      disabled={disabled && !displayOnly}
    >
      <Image
        src={src}
        alt={tile.id}
        width={imgSize}
        height={imgSize}
        style={{ display: "block", borderRadius: 2 }}
        draggable={false}
      />
    </button>
  );
}
