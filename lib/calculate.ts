import {
  Tile,
  KAZE_HONOR,
  TILE_LABEL,
  isYaochu,
  isSuhai,
  sameTile,
  compareTiles,
} from "./tiles";
import { RuleSet, CustomYaku } from "./rules";

// ===== 型定義 =====

export type NakiType = "chi" | "pon" | "minkan" | "ankan";
export interface OpenMentsu {
  /** 副露の3枚または4枚（槓） */
  tiles: Tile[];
  nakiType: NakiType;
  /** 横向きにする牌のインデックス（0=左端, 1=中, 2=右端）。暗槓はundefined */
  stolenIndex?: number;
}

export interface CalcOptions {
  agariTile: Tile;
  isTsumo: boolean;
  bakaze: number; // 1=東 2=南 3=西 4=北
  jikaze: number;
  isRiichi: boolean;
  isIppatsu: boolean;
  isDoubleRiichi: boolean;
  isRinshan: boolean; // 嶺上開花
  isHaitei: boolean; // 海底摸月（ツモ） / 河底撈魚（ロン）
  isChangkan: boolean; // 槍槓
  isTenhou: boolean;
  isChiihou: boolean;
  isRenhou: boolean; // 人和（ローカル役フラグ）
  isNagashiMangan: boolean; // 流し満貫（ローカル役フラグ）
  doraCount: number;
  uraDoraCount: number;
  akaDoraCount: number;
  // 適用するカスタム役（チェックされたもの）
  appliedCustomYaku: CustomYaku[];
  // 副露（鳴き）
  openMentsu?: OpenMentsu[];
}

export interface CalcResult {
  yaku: { name: string; han: number }[];
  customYakuApplied: CustomYaku[];
  fu: number;
  han: number;
  score: {
    ron?: number;
    tsumo?: { dealer: number; other: number };
  };
  fuDetail: { name: string; fu: number }[];
  isYakuman: boolean;
  yakumanCount: number;
  error?: string;
}

// ===== 内部型 =====

type MentsuType = "shuntsu" | "koutsu" | "kantsu";
type MentsuOpen = "closed" | "open" | "ankan";
type WaitType = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";

interface Mentsu {
  type: MentsuType;
  tiles: Tile[];
  open: MentsuOpen;
}

interface ParsedHand {
  mentsuList: Mentsu[];
  jantai: Tile;
  waitType: WaitType;
}

// ===== 手牌解析（4面子1雀頭） =====

function removeFirst(arr: Tile[], pred: (t: Tile) => boolean): Tile[] | null {
  const idx = arr.findIndex(pred);
  if (idx === -1) return null;
  const copy = [...arr];
  copy.splice(idx, 1);
  return copy;
}

function recurse(
  remaining: Tile[],
  mentsuList: Mentsu[],
  jantai: Tile | null,
  agariTile: Tile,
  results: ParsedHand[]
): void {
  if (remaining.length === 0) {
    if (jantai !== null && mentsuList.length === 4) {
      results.push({
        mentsuList: [...mentsuList],
        jantai,
        waitType: detectWaitType(mentsuList, jantai, agariTile),
      });
    }
    return;
  }

  // 残り2枚・雀頭未確定
  if (remaining.length === 2 && jantai === null) {
    if (sameTile(remaining[0], remaining[1])) {
      results.push({
        mentsuList: [...mentsuList],
        jantai: remaining[0],
        waitType: detectWaitType(mentsuList, remaining[0], agariTile),
      });
    }
    return;
  }

  const first = remaining[0];
  const rest = remaining.slice(1);

  // 雀頭として使う
  if (jantai === null) {
    const r1 = removeFirst(rest, (t) => sameTile(t, first));
    if (r1 !== null) recurse(r1, mentsuList, first, agariTile, results);
  }

  // 刻子として使う
  {
    const r1 = removeFirst(rest, (t) => sameTile(t, first));
    if (r1 !== null) {
      const r2 = removeFirst(r1, (t) => sameTile(t, first));
      if (r2 !== null) {
        recurse(
          r2,
          [...mentsuList, { type: "koutsu", tiles: [first, first, first], open: "closed" }],
          jantai,
          agariTile,
          results
        );
      }
    }
  }

  // 順子として使う
  if (first.type !== "honor" && first.number! <= 7) {
    const n = first.number!;
    const r1 = removeFirst(rest, (t) => t.type === first.type && t.number === n + 1);
    if (r1 !== null) {
      const t2 = rest.find((t) => t.type === first.type && t.number === n + 1)!;
      const r2 = removeFirst(r1, (t) => t.type === first.type && t.number === n + 2);
      if (r2 !== null) {
        const t3 = r1.find((t) => t.type === first.type && t.number === n + 2)!;
        recurse(
          r2,
          [...mentsuList, { type: "shuntsu", tiles: [first, t2, t3], open: "closed" }],
          jantai,
          agariTile,
          results
        );
      }
    }
  }
}

function parseHand(tiles: Tile[], agariTile: Tile, initialMentsu: Mentsu[] = []): ParsedHand[] {
  const sorted = [...tiles].sort(compareTiles);
  const results: ParsedHand[] = [];
  recurse(sorted, initialMentsu, null, agariTile, results);
  return results;
}

// ===== 待ち型判定 =====

function detectWaitType(
  mentsuList: Mentsu[],
  jantai: Tile,
  agariTile: Tile
): WaitType {
  if (sameTile(jantai, agariTile)) return "tanki";

  for (const m of mentsuList) {
    if (m.type === "koutsu" && sameTile(m.tiles[0], agariTile)) return "shanpon";
  }

  for (const m of mentsuList) {
    if (m.type !== "shuntsu") continue;
    const idx = m.tiles.findIndex((t) => sameTile(t, agariTile));
    if (idx === -1) continue;
    const min = m.tiles[0].number!;
    const max = m.tiles[2].number!;
    if (idx === 1) return "kanchan";
    if (min === 1 && agariTile.number === 3) return "penchan";
    if (max === 9 && agariTile.number === 7) return "penchan";
    return "ryanmen";
  }

  return "tanki";
}

// ===== 特殊形判定 =====

function isChiitoitsu(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = t.type === "honor" ? t.id : `${t.type}${t.number}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const vals = Array.from(counts.values());
  return vals.length === 7 && vals.every((v) => v >= 2);
}

function isKokushi(tiles: Tile[]): boolean {
  const yaochuIds = [
    "man1", "man9", "pin1", "pin9", "sou1", "sou9",
    "east", "south", "west", "north", "haku", "hatsu", "chun",
  ];
  const ids = tiles.map((t) =>
    t.type === "honor" ? t.id : `${t.type}${t.number}`
  );
  const countMap = new Map<string, number>();
  for (const id of ids) countMap.set(id, (countMap.get(id) ?? 0) + 1);
  const hasAll = yaochuIds.every((id) => (countMap.get(id) ?? 0) >= 1);
  if (!hasAll) return false;
  return yaochuIds.some((id) => (countMap.get(id) ?? 0) >= 2);
}

/** 大車輪：22334455667788p */
function isDaisharinn(tiles: Tile[]): boolean {
  if (!tiles.every((t) => t.type === "pin")) return false;
  const nums = tiles.map((t) => t.number!).sort((a, b) => a - b);
  return nums.join(",") === "2,2,3,3,4,4,5,5,6,6,7,7,8,8";
}

/** 十三不搭：国士と同じ13種の么九牌 + 1枚（対子あり） */
function isShiisanbudou(tiles: Tile[]): boolean {
  return isKokushi(tiles);
}

/** 四連刻：4連続番号の刻子 */
function isShireNkou(mentsuList: Mentsu[]): boolean {
  const koutsuNums = mentsuList
    .filter(
      (m) =>
        (m.type === "koutsu" || m.type === "kantsu") &&
        m.tiles[0].type !== "honor"
    )
    .map((m) => ({ type: m.tiles[0].type, num: m.tiles[0].number! }));

  for (const t of ["man", "pin", "sou"] as const) {
    const nums = koutsuNums
      .filter((k) => k.type === t)
      .map((k) => k.num)
      .sort((a, b) => a - b);
    if (nums.length >= 4) {
      for (let i = 0; i <= nums.length - 4; i++) {
        if (
          nums[i + 1] === nums[i] + 1 &&
          nums[i + 2] === nums[i] + 2 &&
          nums[i + 3] === nums[i] + 3
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

// ===== 役判定 =====

function detectPinfu(parsed: ParsedHand, options: CalcOptions): boolean {
  if (parsed.mentsuList.some((m) => m.type !== "shuntsu")) return false;
  if (parsed.waitType !== "ryanmen") return false;
  const j = parsed.jantai;
  const bakazeHonor = KAZE_HONOR[options.bakaze];
  const jikazeHonor = KAZE_HONOR[options.jikaze];
  if (j.id === "haku" || j.id === "hatsu" || j.id === "chun") return false;
  if (j.honor === bakazeHonor || j.honor === jikazeHonor) return false;
  return true;
}

function detectIipeikou(mentsuList: Mentsu[]): number {
  const keys = mentsuList
    .filter((m) => m.type === "shuntsu" && m.open === "closed")
    .map((m) => `${m.tiles[0].type}${m.tiles[0].number}`);
  const seen = new Map<string, number>();
  for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  return Array.from(seen.values()).reduce((s, v) => s + Math.floor(v / 2), 0);
}

function detectSanshokuDoujun(mentsuList: Mentsu[]): boolean {
  const shuntsu = mentsuList.filter((m) => m.type === "shuntsu");
  const nums = Array.from(
    new Set(
      shuntsu
        .filter((m) => m.tiles[0].type !== "honor")
        .map((m) => m.tiles[0].number!)
    )
  );
  return nums.some(
    (n) =>
      shuntsu.some((m) => m.tiles[0].type === "man" && m.tiles[0].number === n) &&
      shuntsu.some((m) => m.tiles[0].type === "pin" && m.tiles[0].number === n) &&
      shuntsu.some((m) => m.tiles[0].type === "sou" && m.tiles[0].number === n)
  );
}

function detectIkkitsuukan(mentsuList: Mentsu[]): boolean {
  const shuntsu = mentsuList.filter((m) => m.type === "shuntsu");
  return ["man", "pin", "sou"].some(
    (type) =>
      shuntsu.some((m) => m.tiles[0].type === type && m.tiles[0].number === 1) &&
      shuntsu.some((m) => m.tiles[0].type === type && m.tiles[0].number === 4) &&
      shuntsu.some((m) => m.tiles[0].type === type && m.tiles[0].number === 7)
  );
}

function detectSanshokuDoukoku(mentsuList: Mentsu[]): boolean {
  const ko = mentsuList.filter(
    (m) => (m.type === "koutsu" || m.type === "kantsu") && m.tiles[0].type !== "honor"
  );
  const nums = Array.from(new Set(ko.map((m) => m.tiles[0].number!)));
  return nums.some(
    (n) =>
      ko.some((m) => m.tiles[0].type === "man" && m.tiles[0].number === n) &&
      ko.some((m) => m.tiles[0].type === "pin" && m.tiles[0].number === n) &&
      ko.some((m) => m.tiles[0].type === "sou" && m.tiles[0].number === n)
  );
}

function detectChanta(mentsuList: Mentsu[], jantai: Tile): boolean {
  if (!isYaochu(jantai)) return false;
  if (!mentsuList.every((m) => m.tiles.some(isYaochu))) return false;
  return (
    jantai.type === "honor" ||
    mentsuList.some((m) => m.tiles[0].type === "honor")
  );
}

function detectJunchan(mentsuList: Mentsu[], jantai: Tile): boolean {
  if (jantai.type === "honor" || !isYaochu(jantai)) return false;
  if (mentsuList.some((m) => m.tiles[0].type === "honor")) return false;
  if (
    !mentsuList.every((m) =>
      m.tiles.some((t) => t.type !== "honor" && (t.number === 1 || t.number === 9))
    )
  )
    return false;
  return mentsuList.some((m) => m.type === "shuntsu");
}

function detectYaku(
  parsed: ParsedHand | null,
  chiitoitsu: boolean,
  kokushi: boolean,
  tiles: Tile[],
  options: CalcOptions,
  rules: RuleSet,
  isOpen: boolean
): { name: string; han: number }[] {
  const yaku: { name: string; han: number }[] = [];

  // ===== ローカル役（役満）=====
  if (rules.localYaku.ninhou && options.isRenhou) {
    return [{ name: "人和", han: 0 }];
  }
  if (rules.localYaku.nagashiMangan && options.isNagashiMangan) {
    return [{ name: "流し満貫", han: 5 }]; // 満貫相当
  }

  // ===== 天和・地和 =====
  if (options.isTenhou) return [{ name: "天和", han: 0 }];
  if (options.isChiihou) return [{ name: "地和", han: 0 }];

  // ===== 国士無双 =====
  if (kokushi) {
    if (rules.localYaku.shiisanbudou) {
      return [{ name: "十三不搭", han: 0 }];
    }
    return [{ name: "国士無双", han: 0 }];
  }

  // ===== 七対子・大車輪 =====
  if (chiitoitsu) {
    if (rules.localYaku.daisharinn && isDaisharinn(tiles)) {
      return [{ name: "大車輪", han: 0 }];
    }
    yaku.push({ name: "七対子", han: 2 });
    if (options.isDoubleRiichi && rules.doubleRiichiEnabled) yaku.push({ name: "ダブル立直", han: 2 });
    else if (options.isRiichi) yaku.push({ name: "立直", han: 1 });
    if (options.isIppatsu && rules.ippatsuEnabled) yaku.push({ name: "一発", han: 1 });
    if (options.isTsumo) yaku.push({ name: "門前清自摸和", han: 1 });
    if (options.isHaitei) yaku.push({ name: options.isTsumo ? "海底摸月" : "河底撈魚", han: 1 });
    addDora(yaku, options, rules);
    return yaku;
  }

  if (!parsed) return yaku;

  const { mentsuList, jantai } = parsed;
  const bakazeHonor = KAZE_HONOR[options.bakaze];
  const jikazeHonor = KAZE_HONOR[options.jikaze];
  const dragonIds = ["haku", "hatsu", "chun"];
  const kazeIds = ["east", "south", "west", "north"];

  // ===== 役満チェック =====

  // 暗刻・暗槓かどうか（暗槓は門前扱い）
  const isConcealed = (m: Mentsu) =>
    (m.type === "koutsu" || m.type === "kantsu") && (m.open === "closed" || m.open === "ankan");

  // 四槓子
  if (mentsuList.every((m) => m.type === "kantsu")) {
    yaku.push({ name: "四槓子", han: 0 });
  }

  // 四暗刻（暗槓も暗刻扱い）
  const allClosedKoutsu = mentsuList.every(isConcealed);
  if (allClosedKoutsu && (options.isTsumo || parsed.waitType === "tanki")) {
    yaku.push({ name: "四暗刻", han: 0 });
  }

  // 大三元
  const dragonKoutsuCount = dragonIds.filter((id) =>
    mentsuList.some(
      (m) => (m.type === "koutsu" || m.type === "kantsu") && m.tiles[0].id === id
    )
  ).length;
  if (dragonKoutsuCount === 3) yaku.push({ name: "大三元", han: 0 });

  // 大四喜・小四喜
  const kazeKoutsuCount = kazeIds.filter((id) =>
    mentsuList.some(
      (m) => (m.type === "koutsu" || m.type === "kantsu") && m.tiles[0].id === id
    )
  ).length;
  if (kazeKoutsuCount === 4) {
    yaku.push({ name: "大四喜", han: 0 });
  } else if (kazeKoutsuCount === 3 && kazeIds.includes(jantai.id)) {
    yaku.push({ name: "小四喜", han: 0 });
  }

  // 字一色
  if (tiles.every((t) => t.type === "honor")) yaku.push({ name: "字一色", han: 0 });

  // 緑一色
  const greenIds = ["sou2", "sou3", "sou4", "sou6", "sou8", "hatsu"];
  if (tiles.every((t) => greenIds.includes(t.id))) yaku.push({ name: "緑一色", han: 0 });

  // 清老頭
  if (tiles.every((t) => t.type !== "honor" && (t.number === 1 || t.number === 9)))
    yaku.push({ name: "清老頭", han: 0 });

  // 九蓮宝燈
  {
    const types = tiles.map((t) => t.type);
    if (types.every((t) => t === types[0]) && types[0] !== "honor") {
      const nums = tiles.map((t) => t.number ?? 0).sort((a, b) => a - b);
      if (
        nums[0] === 1 && nums[1] === 1 && nums[2] === 1 &&
        nums[11] === 9 && nums[12] === 9 && nums[13] === 9 &&
        [1, 2, 3, 4, 5, 6, 7, 8, 9].every((n) => nums.includes(n))
      ) {
        yaku.push({ name: "九蓮宝燈", han: 0 });
      }
    }
  }

  // 四連刻（ローカル）
  if (rules.localYaku.shireNkou && isShireNkou(mentsuList)) {
    yaku.push({ name: "四連刻", han: 0 });
  }

  // 役満確定
  const yakumanList = yaku.filter((y) => y.han === 0);
  if (yakumanList.length > 0) return yakumanList;

  // ===== 通常役 =====

  // 門前のみの役（鳴きがある場合は無効）
  if (!isOpen) {
    if (options.isDoubleRiichi && rules.doubleRiichiEnabled) {
      yaku.push({ name: "ダブル立直", han: 2 });
    } else if (options.isRiichi) {
      yaku.push({ name: "立直", han: 1 });
    }
    if (options.isIppatsu && rules.ippatsuEnabled) yaku.push({ name: "一発", han: 1 });
    if (options.isTsumo) yaku.push({ name: "門前清自摸和", han: 1 });
  }

  if (options.isChangkan) yaku.push({ name: "槍槓", han: 1 });
  if (options.isRinshan) yaku.push({ name: "嶺上開花", han: 1 });
  if (options.isHaitei && !options.isRinshan) {
    yaku.push({ name: options.isTsumo ? "海底摸月" : "河底撈魚", han: 1 });
  }

  // 平和（門前のみ）
  if (!isOpen && detectPinfu(parsed, options)) yaku.push({ name: "平和", han: 1 });

  // 断么九（食い断：ルール依存）
  if (tiles.every((t) => !isYaochu(t))) {
    if (!isOpen || rules.kuiTanEnabled) yaku.push({ name: "断么九", han: 1 });
  }

  // 一盃口・二盃口（門前のみ）
  if (!isOpen) {
    const iipeikouCount = detectIipeikou(mentsuList);
    if (iipeikouCount >= 2) {
      yaku.push({ name: "二盃口", han: 3 });
    } else if (iipeikouCount === 1) {
      yaku.push({ name: "一盃口", han: 1 });
    }
  }

  // 三色同順（食い下がり：2翻→1翻）
  if (detectSanshokuDoujun(mentsuList)) yaku.push({ name: "三色同順", han: isOpen ? 1 : 2 });

  // 一気通貫（食い下がり：2翻→1翻）
  if (detectIkkitsuukan(mentsuList)) yaku.push({ name: "一気通貫", han: isOpen ? 1 : 2 });

  // 対々和
  if (mentsuList.every((m) => m.type === "koutsu" || m.type === "kantsu")) {
    yaku.push({ name: "対々和", han: 2 });
  }

  // 三暗刻（暗槓も暗刻扱い）
  {
    let ankoCount = mentsuList.filter(isConcealed).length;
    if (!options.isTsumo && parsed.waitType === "shanpon") ankoCount--;
    if (ankoCount >= 3) yaku.push({ name: "三暗刻", han: 2 });
  }

  // 三色同刻
  if (detectSanshokuDoukoku(mentsuList)) yaku.push({ name: "三色同刻", han: 2 });

  // 混全帯么九・純全帯么九（食い下がり）
  const junchan = detectJunchan(mentsuList, jantai);
  const chanta = detectChanta(mentsuList, jantai);
  if (junchan) {
    yaku.push({ name: "純全帯么九", han: isOpen ? 2 : 3 });
  } else if (chanta) {
    yaku.push({ name: "混全帯么九", han: isOpen ? 1 : 2 });
  }

  // 混老頭
  if (
    tiles.every(isYaochu) &&
    !tiles.every((t) => t.type === "honor") &&
    !tiles.every((t) => t.type !== "honor" && (t.number === 1 || t.number === 9))
  ) {
    yaku.push({ name: "混老頭", han: 2 });
  }

  // 小三元
  const dragonJantai = dragonIds.includes(jantai.id);
  const dragonKoutsu2 = dragonIds.filter((id) =>
    mentsuList.some(
      (m) => (m.type === "koutsu" || m.type === "kantsu") && m.tiles[0].id === id
    )
  ).length;
  if (dragonKoutsu2 === 2 && dragonJantai) yaku.push({ name: "小三元", han: 2 });

  // 役牌
  for (const m of mentsuList) {
    if (m.type !== "koutsu" && m.type !== "kantsu") continue;
    const id = m.tiles[0].id;
    if (id === "haku") yaku.push({ name: "白", han: 1 });
    if (id === "hatsu") yaku.push({ name: "發", han: 1 });
    if (id === "chun") yaku.push({ name: "中", han: 1 });
    if (m.tiles[0].honor === bakazeHonor) yaku.push({ name: "場風牌", han: 1 });
    if (m.tiles[0].honor === jikazeHonor) yaku.push({ name: "自風牌", han: 1 });
  }

  // 混一色・清一色（食い下がり）
  const suiTypes = Array.from(new Set(tiles.filter(isSuhai).map((t) => t.type)));
  const hasHonorTile = tiles.some((t) => t.type === "honor");
  if (suiTypes.length === 1) {
    if (hasHonorTile) {
      yaku.push({ name: "混一色", han: isOpen ? 2 : 3 });
    } else {
      yaku.push({ name: "清一色", han: isOpen ? 5 : 6 });
    }
  }

  addDora(yaku, options, rules);

  return yaku;
}

function addDora(
  yaku: { name: string; han: number }[],
  options: CalcOptions,
  rules: RuleSet
): void {
  if (options.doraCount > 0) {
    yaku.push({ name: `ドラ${options.doraCount}`, han: options.doraCount });
  }
  if (options.akaDoraCount > 0 && rules.akaDoraEnabled) {
    yaku.push({ name: `赤ドラ${options.akaDoraCount}`, han: options.akaDoraCount });
  }
  if (options.uraDoraCount > 0 && options.isRiichi && rules.uraDoraEnabled) {
    yaku.push({ name: `裏ドラ${options.uraDoraCount}`, han: options.uraDoraCount });
  }
}

// ===== 符計算 =====

function calcFu(
  parsed: ParsedHand,
  options: CalcOptions,
  isPinfu: boolean,
  isOpen: boolean
): { fu: number; fuDetail: { name: string; fu: number }[] } {
  // 平和ツモは20符固定（門前のみ）
  if (isPinfu && options.isTsumo) {
    return { fu: 20, fuDetail: [{ name: "平和ツモ（20符固定）", fu: 20 }] };
  }

  const detail: { name: string; fu: number }[] = [];
  let fu = 0;

  // 副底：常に20符
  detail.push({ name: "副底", fu: 20 });
  fu += 20;

  // 面子符
  for (const m of parsed.mentsuList) {
    let mfu = 0;
    const tile = m.tiles[0];
    const yc = isYaochu(tile);
    if (m.type === "shuntsu") {
      mfu = 0;
    } else if (m.type === "koutsu") {
      mfu = m.open === "closed" ? (yc ? 8 : 4) : (yc ? 4 : 2);
    } else if (m.type === "kantsu") {
      mfu = m.open === "ankan" ? (yc ? 32 : 16) : (yc ? 16 : 8);
    }
    if (mfu > 0) {
      const typeName =
        m.type === "kantsu"
          ? m.open === "ankan" ? "暗槓" : "明槓"
          : m.open === "closed" ? "暗刻" : "明刻";
      const tileLabel = TILE_LABEL[tile.isAka ? tile.id.slice(0, -1) : tile.id] ?? tile.id;
      detail.push({ name: `${tileLabel}の${typeName}`, fu: mfu });
      fu += mfu;
    }
  }

  // 雀頭符
  const j = parsed.jantai;
  const bakazeHonor = KAZE_HONOR[options.bakaze];
  const jikazeHonor = KAZE_HONOR[options.jikaze];
  if (j.id === "haku" || j.id === "hatsu" || j.id === "chun") {
    detail.push({ name: `${TILE_LABEL[j.id] ?? j.id}の雀頭`, fu: 2 });
    fu += 2;
  } else if (j.honor === bakazeHonor) {
    detail.push({ name: "場風牌の雀頭", fu: 2 });
    fu += 2;
  } else if (j.honor === jikazeHonor) {
    detail.push({ name: "自風牌の雀頭", fu: 2 });
    fu += 2;
  }

  // 待ち符
  const waitFu: Record<WaitType, number> = {
    ryanmen: 0, shanpon: 0, kanchan: 2, penchan: 2, tanki: 2,
  };
  const wfu = waitFu[parsed.waitType];
  if (wfu > 0) {
    const waitNames: Record<WaitType, string> = {
      ryanmen: "両面待ち", shanpon: "双碰待ち",
      kanchan: "嵌張待ち", penchan: "辺張待ち", tanki: "単騎待ち",
    };
    detail.push({ name: waitNames[parsed.waitType], fu: wfu });
    fu += wfu;
  }

  // ツモ符
  if (options.isTsumo && !isPinfu) {
    detail.push({ name: "ツモ", fu: 2 });
    fu += 2;
  }

  // 門前ロン加符（門前のみ）
  if (!options.isTsumo && !isOpen) {
    detail.push({ name: "門前加符", fu: 10 });
    fu += 10;
  }

  const fuRounded = Math.ceil(fu / 10) * 10;
  return { fu: fuRounded, fuDetail: detail };
}

// ===== 点数計算 =====

function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

function calcBaseScore(han: number, fu: number, kiriage: boolean): number {
  if (han >= 13) return 8000; // 役満
  if (han >= 11) return 6000; // 三倍満
  if (han >= 8) return 4000; // 倍満
  if (han >= 6) return 3000; // 跳満
  if (han >= 5) return 2000; // 満貫
  const base = fu * Math.pow(2, han + 2);
  if (kiriage && base >= 1920) return 2000; // 切り上げ満貫
  return Math.min(base, 2000);
}

function buildScore(
  han: number,
  fu: number,
  isDealer: boolean,
  isTsumo: boolean,
  rules: RuleSet
): CalcResult["score"] {
  const base = calcBaseScore(han, fu, rules.kiriage);

  if (isDealer) {
    if (isTsumo) {
      const each = roundUp100(base * 2);
      return { tsumo: { dealer: each, other: each } }; // 全員から同額
    }
    return { ron: roundUp100(base * 6) };
  } else {
    if (isTsumo) {
      return {
        tsumo: {
          dealer: roundUp100(base * 2),
          other: roundUp100(base),
        },
      };
    }
    return { ron: roundUp100(base * 4) };
  }
}

function buildYakumanScore(
  count: number,
  isDealer: boolean,
  isTsumo: boolean
): CalcResult["score"] {
  const base = 8000 * count;
  if (isDealer) {
    if (isTsumo) return { tsumo: { dealer: base * 2, other: base * 2 } };
    return { ron: base * 6 };
  } else {
    if (isTsumo) return { tsumo: { dealer: base * 2, other: base } };
    return { ron: base * 4 };
  }
}

function totalScore(score: CalcResult["score"], isDealer: boolean, isTsumo: boolean): number {
  if (isTsumo) {
    const t = score.tsumo;
    if (!t) return 0;
    return isDealer ? t.dealer * 3 : t.dealer + t.other * 2;
  }
  return score.ron ?? 0;
}

// ===== スコアランク名 =====

export function scoreRankName(han: number, fu: number): string {
  if (han === 0) return "役満";
  if (han >= 13) return "役満";
  if (han >= 11) return "三倍満";
  if (han >= 8) return "倍満";
  if (han >= 6) return "跳満";
  if (han >= 5) return "満貫";
  if (fu * Math.pow(2, han + 2) >= 2000) return "満貫";
  return "";
}

// ===== メイン計算関数 =====

export function calculate(
  hand: Tile[],
  options: CalcOptions,
  rules: RuleSet
): CalcResult {
  const openMentsuList = options.openMentsu ?? [];

  // 副露面子を Mentsu[] に変換
  const openMentsuAsMentsu: Mentsu[] = openMentsuList.map((om) => ({
    type:
      om.nakiType === "chi"
        ? "shuntsu"
        : om.nakiType === "minkan" || om.nakiType === "ankan"
        ? "kantsu"
        : "koutsu",
    tiles: om.tiles,
    open: om.nakiType === "ankan" ? "ankan" : "open",
  }));

  // 鳴きがあると門前でなくなる（暗槓は門前扱い）
  const isOpen = openMentsuList.some((m) => m.nakiType !== "ankan");

  // 全牌 = 手牌（門前牌）+ 副露牌
  // 槓は4枚だが、嶺上牌で1枚補充されるため手牌への影響は1組あたり3枚分
  const expectedClosedCount = 14 - openMentsuList.length * 3;
  const allTiles = [...hand, ...openMentsuList.flatMap((m) => m.tiles)];

  if (hand.length !== expectedClosedCount) {
    return errorResult(`手牌は${expectedClosedCount}枚必要です（副露${openMentsuList.length}組）`);
  }

  // 鳴きがある場合、七対子・国士無双は不可
  const kokushi = !isOpen && isKokushi(allTiles);
  const chiitoitsu = !isOpen && isChiitoitsu(allTiles);
  const parsedList =
    kokushi || chiitoitsu ? [] : parseHand(hand, options.agariTile, openMentsuAsMentsu);

  if (!kokushi && !chiitoitsu && parsedList.length === 0) {
    return errorResult("アガリの形ではありません");
  }

  const isDealer = options.jikaze === 1;
  let bestResult: CalcResult | null = null;

  const candidates: (ParsedHand | null)[] =
    kokushi || chiitoitsu ? [null] : parsedList;

  for (const parsed of candidates) {
    const yaku = detectYaku(parsed, chiitoitsu, kokushi, allTiles, options, rules, isOpen);

    const nonDoraYaku = yaku.filter(
      (y) =>
        !y.name.startsWith("ドラ") &&
        !y.name.startsWith("赤ドラ") &&
        !y.name.startsWith("裏ドラ")
    );
    if (nonDoraYaku.length === 0) continue;

    const yakumanYaku = yaku.filter((y) => y.han === 0);
    const isYakumanHand = yakumanYaku.length > 0;
    const yakumanCount = yakumanYaku.length;

    let han = 0;
    let fu = 0;
    let fuDetail: { name: string; fu: number }[] = [];

    if (isYakumanHand) {
      han = yakumanCount * 13;
    } else {
      han = yaku.reduce((s, y) => s + y.han, 0);
      if (chiitoitsu) {
        fu = 25;
        fuDetail = [{ name: "七対子", fu: 25 }];
      } else if (parsed) {
        const isPinfu = !isOpen && detectPinfu(parsed, options);
        const fuResult = calcFu(parsed, options, isPinfu, isOpen);
        fu = fuResult.fu;
        fuDetail = fuResult.fuDetail;
      }
    }

    const score = isYakumanHand
      ? buildYakumanScore(yakumanCount, isDealer, options.isTsumo)
      : buildScore(han, fu, isDealer, options.isTsumo, rules);

    const result: CalcResult = {
      yaku,
      customYakuApplied: options.appliedCustomYaku.filter((c) => c.enabled),
      fu,
      han,
      score,
      fuDetail,
      isYakuman: isYakumanHand,
      yakumanCount,
    };

    if (
      !bestResult ||
      totalScore(result.score, isDealer, options.isTsumo) >
        totalScore(bestResult.score, isDealer, options.isTsumo)
    ) {
      bestResult = result;
    }
  }

  // カスタム役を適用
  if (bestResult) {
    const customYaku = options.appliedCustomYaku.filter((c) => c.enabled);
    if (customYaku.length > 0) {
      const customHan = customYaku.reduce((s, c) => s + (c.han === 0 ? 13 : c.han), 0);
      bestResult.han += customHan;
      bestResult.customYakuApplied = customYaku;
    }
    return bestResult;
  }

  return errorResult("役がありません");
}

function errorResult(message: string): CalcResult {
  return {
    yaku: [],
    customYakuApplied: [],
    fu: 0,
    han: 0,
    score: {},
    fuDetail: [],
    isYakuman: false,
    yakumanCount: 0,
    error: message,
  };
}
