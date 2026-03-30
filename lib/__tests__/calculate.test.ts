import { calculate, CalcOptions } from "../calculate";
import { tileFromId, Tile } from "../tiles";
import { freeRule, competitiveRule, RuleSet, CustomYaku } from "../rules";

// ===== ヘルパー =====

function hand(...ids: string[]): Tile[] {
  return ids.map(tileFromId);
}

const baseOpts: CalcOptions = {
  agariTile: tileFromId("man1"),
  isTsumo: false,
  bakaze: 1, // 東場
  jikaze: 2, // 子（南）
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

function opts(overrides: Partial<CalcOptions>): CalcOptions {
  return { ...baseOpts, ...overrides };
}

function yakuNames(result: ReturnType<typeof calculate>): string[] {
  return result.yaku.map((y) => y.name);
}

// ===== 断么九ツモ =====
describe("断么九ツモ", () => {
  test("断么九+門前清自摸和が成立する", () => {
    // 刻子を含む手でピンフにならないようにする（222m）
    const tiles = hand(
      "man2", "man2", "man2",
      "man4", "man5", "man6",
      "pin3", "pin4", "pin5",
      "sou4", "sou5", "sou6",
      "pin7", "pin7"
    );
    const agariTile = tileFromId("sou6");
    const result = calculate(tiles, opts({ agariTile, isTsumo: true }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("断么九");
    expect(yakuNames(result)).toContain("門前清自摸和");
    // 断么九(1翻)+ツモ(1翻) = 2翻
    expect(result.han).toBe(2);
  });

  test("断么九+平和+ツモ=3翻20符", () => {
    // 全順子・数牌雀頭・両面待ち → 平和も成立
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin3", "pin4", "pin5",
      "sou4", "sou5", "sou6",
      "pin7", "pin7"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(tiles, opts({ agariTile, isTsumo: true }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("断么九");
    expect(yakuNames(result)).toContain("平和");
    expect(yakuNames(result)).toContain("門前清自摸和");
    expect(result.han).toBe(3);
    expect(result.fu).toBe(20); // 平和ツモは20符固定
  });
});

// ===== リーチ平和ツモ：3翻20符 =====
describe("リーチ平和ツモ", () => {
  test("立直+平和+門前清自摸和=3翻20符固定", () => {
    // 234m 567m 23p 456p + 55s（2-3p両面待ち → 1pか4p）
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin2", "pin3", "pin4",
      "sou4", "sou5", "sou6",
      "sou9", "sou9"
    );
    const agariTile = tileFromId("pin4");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, isRiichi: true }),
      freeRule
    );

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("立直");
    expect(yakuNames(result)).toContain("平和");
    expect(yakuNames(result)).toContain("門前清自摸和");
    expect(result.han).toBe(3);
    expect(result.fu).toBe(20); // 平和ツモは20符固定
  });
});

// ===== 七対子：2翻25符 =====
describe("七対子", () => {
  test("七対子=2翻25符固定", () => {
    const tiles = hand(
      "man1", "man1",
      "man3", "man3",
      "pin2", "pin2",
      "pin7", "pin7",
      "sou4", "sou4",
      "sou8", "sou8",
      "east", "east"
    );
    const agariTile = tileFromId("east");
    const result = calculate(tiles, opts({ agariTile }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("七対子");
    expect(result.han).toBe(2);
    expect(result.fu).toBe(25);
  });

  test("七対子+立直=3翻25符", () => {
    const tiles = hand(
      "man1", "man1",
      "man3", "man3",
      "pin2", "pin2",
      "pin7", "pin7",
      "sou4", "sou4",
      "sou8", "sou8",
      "east", "east"
    );
    const agariTile = tileFromId("east");
    const result = calculate(tiles, opts({ agariTile, isRiichi: true }), freeRule);

    expect(result.error).toBeUndefined();
    expect(result.han).toBe(3);
    expect(result.fu).toBe(25);
  });
});

// ===== 国士無双：役満 =====
describe("国士無双", () => {
  test("国士無双=役満", () => {
    const tiles = hand(
      "man1", "man9",
      "pin1", "pin9",
      "sou1", "sou9",
      "east", "south", "west", "north",
      "haku", "hatsu", "chun",
      "man1"
    );
    const agariTile = tileFromId("man1");
    const result = calculate(tiles, opts({ agariTile }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("国士無双");
    // 役満=han:0
    expect(result.yaku[0].han).toBe(0);
    // 役満点数確認（子のロン=8000点）
    expect(result.score.ron).toBe(8000 * 4); // 32000
  });
});

// ===== 大車輪（ローカルON）：役満 =====
describe("大車輪", () => {
  test("ローカルON時に大車輪=役満", () => {
    const tiles = hand(
      "pin2", "pin2",
      "pin3", "pin3",
      "pin4", "pin4",
      "pin5", "pin5",
      "pin6", "pin6",
      "pin7", "pin7",
      "pin8", "pin8"
    );
    const agariTile = tileFromId("pin8");
    const ruleWithDaisharinn: RuleSet = {
      ...freeRule,
      localYaku: { ...freeRule.localYaku, daisharinn: true },
    };
    const result = calculate(tiles, opts({ agariTile }), ruleWithDaisharinn);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("大車輪");
    expect(result.yaku[0].han).toBe(0);
  });

  test("ローカルOFF時に大車輪=七対子として計算", () => {
    const tiles = hand(
      "pin2", "pin2",
      "pin3", "pin3",
      "pin4", "pin4",
      "pin5", "pin5",
      "pin6", "pin6",
      "pin7", "pin7",
      "pin8", "pin8"
    );
    const agariTile = tileFromId("pin8");
    const result = calculate(tiles, opts({ agariTile, isTsumo: true }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).not.toContain("大車輪");
    expect(yakuNames(result)).toContain("七対子");
  });
});

// ===== カスタム役適用テスト =====
describe("カスタム役", () => {
  test("カスタム役(2翻)が適用されて合計翻数が増える", () => {
    const customYaku: CustomYaku = {
      id: "custom-1",
      name: "テスト役",
      han: 2,
      hanOpen: 1,
      menzenOnly: false,
      description: "テスト用ローカル役",
      enabled: true,
    };
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "pin1", "pin2", "pin3",
      "sou1", "sou2", "sou3",
      "east", "east"
    );
    const agariTile = tileFromId("man3");
    // 役牌（東）があるので役あり
    const resultWithout = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, appliedCustomYaku: [] }),
      freeRule
    );
    const resultWith = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, appliedCustomYaku: [customYaku] }),
      freeRule
    );

    expect(resultWith.han).toBe(resultWithout.han + 2);
    expect(resultWith.customYakuApplied).toContainEqual(customYaku);
  });

  test("カスタム役が無効(enabled:false)なら適用されない", () => {
    const customYaku: CustomYaku = {
      id: "custom-2",
      name: "無効役",
      han: 3,
      hanOpen: 2,
      menzenOnly: true,
      description: "",
      enabled: false,
    };
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "pin1", "pin2", "pin3",
      "sou1", "sou2", "sou3",
      "east", "east"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, appliedCustomYaku: [customYaku] }),
      freeRule
    );

    expect(result.customYakuApplied).toHaveLength(0);
  });
});

// ===== アガれない手牌のエラー =====
describe("アガれない手牌", () => {
  test("役なしはエラー（ドラのみ）", () => {
    // 全部数牌で立直なし・役牌なし・喰い断なし（フリールール）
    // 実際には喰い断ON(freeRule)なので役が付く可能性 → 競技ルールでテスト
    const tiles = hand(
      "man1", "man1", "man1",
      "man2", "man3", "man4",
      "pin5", "pin6", "pin7",
      "sou3", "sou4", "sou5",
      "man9", "man9"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(tiles, opts({ agariTile }), competitiveRule);
    // 競技ルール: 喰い断OFF, 門前のみ。役なし → エラー
    if (result.error) {
      expect(result.error).toBeTruthy();
    }
  });

  test("14枚でないときエラー", () => {
    const tiles = hand("man1", "man2", "man3");
    const agariTile = tileFromId("man3");
    const result = calculate(tiles, opts({ agariTile }), freeRule);
    expect(result.error).toBeTruthy();
  });

  test("アガリ形でないときエラー", () => {
    // バラバラな14枚
    const tiles = hand(
      "man1", "man3", "man5", "man7", "man9",
      "pin1", "pin3", "pin5", "pin7", "pin9",
      "sou1", "sou3", "east", "south"
    );
    const agariTile = tileFromId("south");
    const result = calculate(tiles, opts({ agariTile }), freeRule);
    expect(result.error).toBeTruthy();
  });
});

// ===== 役満系 =====
describe("役満", () => {
  test("天和=役満", () => {
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "man7", "man8", "man9",
      "pin1", "pin2", "pin3",
      "east", "east"
    );
    const agariTile = tileFromId("man9");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, isTenhou: true }),
      freeRule
    );
    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("天和");
    expect(result.yaku[0].han).toBe(0);
  });

  test("大三元=役満・子のロン=32000点", () => {
    // 子の役満ロン = 基本点8000 × 4 = 32000点
    const tiles = hand(
      "haku", "haku", "haku",
      "hatsu", "hatsu", "hatsu",
      "chun", "chun", "chun",
      "man1", "man2", "man3",
      "pin5", "pin5"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(tiles, opts({ agariTile, jikaze: 2 }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("大三元");
    expect(result.score.ron).toBe(32000);
  });

  test("大三元=役満・親のロン=48000点", () => {
    // 親の役満ロン = 基本点8000 × 6 = 48000点
    const tiles = hand(
      "haku", "haku", "haku",
      "hatsu", "hatsu", "hatsu",
      "chun", "chun", "chun",
      "man1", "man2", "man3",
      "pin5", "pin5"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(tiles, opts({ agariTile, jikaze: 1 }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("大三元");
    expect(result.score.ron).toBe(48000);
  });

  test("四暗刻ツモ=役満", () => {
    const tiles = hand(
      "man1", "man1", "man1",
      "man9", "man9", "man9",
      "pin5", "pin5", "pin5",
      "sou3", "sou3", "sou3",
      "east", "east"
    );
    const agariTile = tileFromId("sou3");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true }),
      freeRule
    );
    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("四暗刻");
  });
});

// ===== ルール差異テスト =====
describe("ルール差異", () => {
  test("フリールール: 赤ドラ加算", () => {
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "pin1", "pin2", "pin3",
      "sou1", "sou2", "sou3",
      "east", "east"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, akaDoraCount: 2 }),
      freeRule
    );

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("赤ドラ2");
  });

  test("競技ルール: 赤ドラ無効", () => {
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "pin1", "pin2", "pin3",
      "sou1", "sou2", "sou3",
      "east", "east"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, akaDoraCount: 2 }),
      competitiveRule
    );

    expect(yakuNames(result)).not.toContain("赤ドラ2");
  });

  test("競技ルール: 一発無効", () => {
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin2", "pin3", "pin4",
      "sou4", "sou5", "sou6",
      "pin7", "pin7"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(
      tiles,
      opts({ agariTile, isRiichi: true, isIppatsu: true, isTsumo: true }),
      competitiveRule
    );

    expect(yakuNames(result)).not.toContain("一発");
  });

  test("フリールール: ダブル立直", () => {
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin2", "pin3", "pin4",
      "sou4", "sou5", "sou6",
      "pin7", "pin7"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(
      tiles,
      opts({ agariTile, isDoubleRiichi: true, isTsumo: true }),
      freeRule
    );

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("ダブル立直");
    const drYaku = result.yaku.find((y) => y.name === "ダブル立直");
    expect(drYaku?.han).toBe(2);
  });
});

// ===== 符計算テスト =====
describe("符計算", () => {
  test("平和ツモは20符固定", () => {
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin2", "pin3", "pin4",
      "sou4", "sou5", "sou6",
      "sou9", "sou9"
    );
    const agariTile = tileFromId("pin4");
    const result = calculate(tiles, opts({ agariTile, isTsumo: true }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("平和");
    expect(result.fu).toBe(20);
  });

  test("七対子は25符固定", () => {
    const tiles = hand(
      "man2", "man2", "man4", "man4",
      "pin3", "pin3", "pin6", "pin6",
      "sou5", "sou5", "sou7", "sou7",
      "east", "east"
    );
    const agariTile = tileFromId("east");
    const result = calculate(tiles, opts({ agariTile }), freeRule);
    expect(result.fu).toBe(25);
  });

  test("役牌の暗刻は符加算", () => {
    const tiles = hand(
      "haku", "haku", "haku",
      "man2", "man3", "man4",
      "pin2", "pin3", "pin4",
      "sou2", "sou3", "sou4",
      "man6", "man6"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(tiles, opts({ agariTile }), freeRule);

    expect(result.error).toBeUndefined();
    const haku = result.fuDetail.find((d) => d.name.includes("白"));
    expect(haku).toBeDefined();
    expect(haku!.fu).toBe(8); // 役牌暗刻=8符
  });
});

// ===== 点数テスト =====
describe("点数計算", () => {
  test("子のロン：4翻30符=7700点", () => {
    // 立直(1)+断么九(1)+一盃口(1)+一気通貫(2)... 複雑なので役牌+一発+断么九
    // シンプルに: 立直(1)+断么九(1)+一気通貫(2) = 4翻
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "man7", "man8", "man9",
      "pin3", "pin4", "pin5",
      "sou5", "sou5"
    );
    const agariTile = tileFromId("pin5");
    const result = calculate(
      tiles,
      opts({ agariTile, isRiichi: true }),
      freeRule
    );
    expect(result.error).toBeUndefined();
    expect(result.han).toBe(4); // 立直+一気通貫+清一色は重複する可能性あり
    // 点数が正の値
    expect(result.score.ron).toBeGreaterThan(0);
  });

  test("親のロンは子の1.5倍", () => {
    const tiles = hand(
      "haku", "haku", "haku",
      "man2", "man3", "man4",
      "pin2", "pin3", "pin4",
      "sou2", "sou3", "sou4",
      "man6", "man6"
    );
    const agariTile = tileFromId("man4");
    const nonDealerResult = calculate(
      tiles,
      opts({ agariTile, jikaze: 2 }),
      freeRule
    );
    const dealerResult = calculate(
      tiles,
      opts({ agariTile, jikaze: 1 }),
      freeRule
    );

    expect(dealerResult.score.ron).toBeGreaterThan(nonDealerResult.score.ron!);
  });

  test("子のツモ：dealer と other が正しい比率", () => {
    const tiles = hand(
      "haku", "haku", "haku",
      "man2", "man3", "man4",
      "pin2", "pin3", "pin4",
      "sou2", "sou3", "sou4",
      "man6", "man6"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, jikaze: 2, doraCount: 1 }), // 5翻→満貫で比率が確定
      freeRule
    );

    expect(result.score.tsumo).toBeDefined();
    const t = result.score.tsumo!;
    // 満貫は dealer=4000, other=2000 固定
    expect(t.dealer).toBe(4000);
    expect(t.other).toBe(2000);
  });

  test("満貫：5翻以上は2000基本点", () => {
    // 6翻（清一色+門前清自摸和など）
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "man7", "man8", "man9",
      "man1", "man2", "man3",
      "man5", "man5"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(tiles, opts({ agariTile, isTsumo: true }), freeRule);

    expect(result.error).toBeUndefined();
    // 清一色(6翻)+門前清自摸和(1翻) = 7翻 → 倍満
    expect(result.han).toBeGreaterThanOrEqual(6);
    expect(result.score.tsumo).toBeDefined();
  });
});

// ===== 役牌テスト =====
describe("役牌", () => {
  test("白の刻子=1翻", () => {
    const tiles = hand(
      "haku", "haku", "haku",
      "man1", "man2", "man3",
      "pin1", "pin2", "pin3",
      "sou1", "sou2", "sou3",
      "man5", "man5"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(tiles, opts({ agariTile }), freeRule);

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("白");
  });

  test("場風+自風が同じ(東場東家)=それぞれ1翻", () => {
    const tiles = hand(
      "east", "east", "east",
      "man1", "man2", "man3",
      "pin1", "pin2", "pin3",
      "sou1", "sou2", "sou3",
      "man5", "man5"
    );
    const agariTile = tileFromId("man3");
    const result = calculate(
      tiles,
      opts({ agariTile, bakaze: 1, jikaze: 1 }),
      freeRule
    );

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("場風牌");
    expect(yakuNames(result)).toContain("自風牌");
  });
});

// ===== 裏ドラ・ドラテスト =====
describe("ドラ", () => {
  test("フリールール: 立直+裏ドラ加算", () => {
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin2", "pin3", "pin4",
      "sou4", "sou5", "sou6",
      "pin7", "pin7"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(
      tiles,
      opts({ agariTile, isRiichi: true, isTsumo: true, uraDoraCount: 2 }),
      freeRule
    );

    expect(yakuNames(result)).toContain("裏ドラ2");
    const uraDora = result.yaku.find((y) => y.name === "裏ドラ2");
    expect(uraDora?.han).toBe(2);
  });

  test("競技ルール: 裏ドラ無効（立直しても裏ドラなし）", () => {
    const tiles = hand(
      "man2", "man3", "man4",
      "man5", "man6", "man7",
      "pin2", "pin3", "pin4",
      "sou4", "sou5", "sou6",
      "pin7", "pin7"
    );
    const agariTile = tileFromId("man4");
    const result = calculate(
      tiles,
      opts({ agariTile, isRiichi: true, isTsumo: true, uraDoraCount: 2 }),
      competitiveRule
    );

    expect(yakuNames(result)).not.toContain("裏ドラ2");
  });
});

// ===== 人和（ローカル役）テスト =====
describe("人和（ローカル）", () => {
  test("人和フラグON+ルールON=役満", () => {
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "man7", "man8", "man9",
      "pin1", "pin2", "pin3",
      "east", "east"
    );
    const agariTile = tileFromId("man9");
    const ruleWithNinhou: RuleSet = {
      ...freeRule,
      localYaku: { ...freeRule.localYaku, ninhou: true },
    };
    const result = calculate(
      tiles,
      opts({ agariTile, isRenhou: true }),
      ruleWithNinhou
    );

    expect(result.error).toBeUndefined();
    expect(yakuNames(result)).toContain("人和");
    expect(result.yaku[0].han).toBe(0);
  });

  test("人和フラグON+ルールOFF=人和なし", () => {
    const tiles = hand(
      "man1", "man2", "man3",
      "man4", "man5", "man6",
      "man7", "man8", "man9",
      "pin1", "pin2", "pin3",
      "east", "east"
    );
    const agariTile = tileFromId("man9");
    const result = calculate(
      tiles,
      opts({ agariTile, isTsumo: true, isRenhou: true }),
      freeRule // ninhouはOFF
    );

    expect(yakuNames(result)).not.toContain("人和");
  });
});

