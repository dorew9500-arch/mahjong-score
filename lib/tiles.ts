// ===== 牌の種類 =====

export type TileType = "man" | "pin" | "sou" | "honor";

export type HonorKind =
  | "east"
  | "south"
  | "west"
  | "north"
  | "haku"
  | "hatsu"
  | "chun";

// ===== 牌 =====

export interface Tile {
  type: TileType;
  number?: number; // 数牌: 1-9
  honor?: HonorKind; // 字牌
  id: string; // 例: "man1", "pin5r"（赤ドラ）, "east"
  isAka?: boolean; // 赤ドラフラグ
}

// ===== 風牌マッピング =====

export const KAZE_HONOR: Record<number, HonorKind> = {
  1: "east",
  2: "south",
  3: "west",
  4: "north",
};

// ===== 表示名 =====

export const TILE_LABEL: Record<string, string> = {
  man1: "1萬", man2: "2萬", man3: "3萬", man4: "4萬", man5: "5萬",
  man6: "6萬", man7: "7萬", man8: "8萬", man9: "9萬",
  pin1: "1筒", pin2: "2筒", pin3: "3筒", pin4: "4筒", pin5: "5筒",
  pin6: "6筒", pin7: "7筒", pin8: "8筒", pin9: "9筒",
  sou1: "1索", sou2: "2索", sou3: "3索", sou4: "4索", sou5: "5索",
  sou6: "6索", sou7: "7索", sou8: "8索", sou9: "9索",
  east: "東", south: "南", west: "西", north: "北",
  haku: "白", hatsu: "發", chun: "中",
};

// ===== 牌IDから牌オブジェクトを生成 =====

export function tileFromId(id: string): Tile {
  if (id.endsWith("r")) {
    // 赤ドラ（例: "man5r"）
    const base = id.slice(0, -1); // "man5"
    const tile = tileFromId(base);
    return { ...tile, id, isAka: true };
  }
  // 字牌を先にチェック（"south" が "sou" に誤マッチしないよう）
  const honorMap: Record<string, HonorKind> = {
    east: "east", south: "south", west: "west", north: "north",
    haku: "haku", hatsu: "hatsu", chun: "chun",
  };
  if (id in honorMap) {
    return { type: "honor", honor: honorMap[id], id };
  }
  if (id.startsWith("man")) return { type: "man", number: parseInt(id.slice(3)), id };
  if (id.startsWith("pin")) return { type: "pin", number: parseInt(id.slice(3)), id };
  if (id.startsWith("sou")) return { type: "sou", number: parseInt(id.slice(3)), id };
  throw new Error(`Unknown tile id: ${id}`);
}

// ===== 全牌リスト（UIセレクター用） =====

export const ALL_TILES: Tile[] = [
  ...Array.from({ length: 9 }, (_, i) => tileFromId(`man${i + 1}`)),
  ...Array.from({ length: 9 }, (_, i) => tileFromId(`pin${i + 1}`)),
  ...Array.from({ length: 9 }, (_, i) => tileFromId(`sou${i + 1}`)),
  ...["east", "south", "west", "north", "haku", "hatsu", "chun"].map(tileFromId),
];

// 赤ドラ牌一覧
export const AKA_DORA_TILES: Tile[] = [
  tileFromId("man5r"),
  tileFromId("pin5r"),
  tileFromId("sou5r"),
];

// ===== ユーティリティ =====

export function isYaochu(tile: Tile): boolean {
  if (tile.type === "honor") return true;
  return tile.number === 1 || tile.number === 9;
}

export function isSuhai(tile: Tile): boolean {
  return tile.type !== "honor";
}

/** 牌のゲーム上のID（赤ドラも通常牌と同等に扱う） */
export function tileBaseId(tile: Tile): string {
  if (tile.isAka) return tile.id.slice(0, -1); // "man5r" → "man5"
  return tile.id;
}

export function sameTile(a: Tile, b: Tile): boolean {
  return tileBaseId(a) === tileBaseId(b);
}

export function compareTiles(a: Tile, b: Tile): number {
  const typeOrder: Record<TileType, number> = { man: 0, pin: 1, sou: 2, honor: 3 };
  if (typeOrder[a.type] !== typeOrder[b.type]) {
    return typeOrder[a.type] - typeOrder[b.type];
  }
  if (a.type === "honor" && b.type === "honor") {
    const honorOrder: Record<HonorKind, number> = {
      east: 0, south: 1, west: 2, north: 3, haku: 4, hatsu: 5, chun: 6,
    };
    return honorOrder[a.honor!] - honorOrder[b.honor!];
  }
  return (a.number ?? 0) - (b.number ?? 0);
}
