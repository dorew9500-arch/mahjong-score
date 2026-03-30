"use client";
import { Tile, TILE_LABEL } from "@/lib/tiles";

interface Props {
  tile: Tile;
  onClick: (tile: Tile) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

// 個別タイルの文字色オーバーライド
const TILE_COLOR: Record<string, string> = {
  hatsu: "#116611", // 發：緑
  chun:  "#cc2222", // 中：赤
};

export function TileButton({ tile, onClick, disabled, size = "md" }: Props) {
  const typeClass =
    tile.type === "man" ? "tile-man" :
    tile.type === "pin" ? "tile-pin" :
    tile.type === "sou" ? "tile-sou" : "tile-honor";

  const sizeStyle = size === "sm"
    ? { minWidth: 38, minHeight: 40, fontSize: "0.8rem" }
    : {};

  const baseId = tile.isAka ? tile.id.slice(0, -1) : tile.id;
  const label = TILE_LABEL[baseId] ?? tile.id;

  // 数牌は「数字（黒）＋漢字（色）」に分割して表示
  // 赤ドラは数字も含めて全体を赤に
  const suitColor =
    tile.type === "man" ? "#cc2222" :
    tile.type === "pin" ? "#1144cc" :
    tile.type === "sou" ? "#116611" :
    (TILE_COLOR[tile.id] ?? "#1a1a1a");

  // 索子の数字色（紅孔雀対応）
  const souNumColor =
    tile.type === "sou" && [1, 5, 7, 9].includes(tile.number!) ? "#cc2222" :
    tile.type === "sou" && [2, 3, 4, 6, 8].includes(tile.number!) ? "#116611" :
    "#1a1a1a";

  const numColor = tile.type === "sou" ? souNumColor : "#1a1a1a";

  const content = tile.isAka ? (
    <span style={{ color: "#ee1111" }}>{label}</span>
  ) : tile.type !== "honor" ? (
    // 数牌：「数字」+ 「萬/筒/索」色
    <>
      <span style={{ color: numColor }}>{label.slice(0, -1)}</span>
      <span style={{ color: suitColor }}>{label.slice(-1)}</span>
    </>
  ) : (
    // 字牌：全体に suitColor
    <span style={{ color: suitColor }}>{label}</span>
  );

  return (
    <button
      className={`tile-btn ${typeClass}`}
      style={{ ...sizeStyle, opacity: disabled ? 0.4 : 1 }}
      onClick={() => !disabled && onClick(tile)}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
