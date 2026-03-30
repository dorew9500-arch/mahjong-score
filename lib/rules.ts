// ===== カスタム役 =====

export interface CustomYaku {
  id: string;
  name: string;
  han: number; // 0=役満
  hanOpen: number; // 食い下がり後翻数
  menzenOnly: boolean;
  description: string;
  enabled: boolean;
}

// ===== ルールセット =====

export interface RuleSet {
  name: string;
  mode: "free" | "competitive" | "custom";

  // 基本ルール
  akaDoraEnabled: boolean;
  ippatsuEnabled: boolean;
  uraDoraEnabled: boolean;
  doubleRiichiEnabled: boolean;
  kuiTanEnabled: boolean; // 喰い断（食いタン）
  atoDuke: boolean; // 後付け
  kiriage: boolean; // 切り上げ満貫

  // ローカル役
  localYaku: {
    ninhou: boolean; // 人和（役満）
    nagashiMangan: boolean; // 流し満貫（満貫）
    daisharinn: boolean; // 大車輪（役満）
    shiisanbudou: boolean; // 十三不搭（役満）
    shireNkou: boolean; // 四連刻（役満）
  };

  // カスタム役
  customYaku: CustomYaku[];
}

// ===== プリセット =====

export const freeRule: RuleSet = {
  name: "フリー（一般）",
  mode: "free",
  akaDoraEnabled: true,
  ippatsuEnabled: true,
  uraDoraEnabled: true,
  doubleRiichiEnabled: true,
  kuiTanEnabled: true,
  atoDuke: true,
  kiriage: false,
  localYaku: {
    ninhou: false,
    nagashiMangan: false,
    daisharinn: false,
    shiisanbudou: false,
    shireNkou: false,
  },
  customYaku: [],
};

export const competitiveRule: RuleSet = {
  name: "競技（アリアリなし）",
  mode: "competitive",
  akaDoraEnabled: false,
  ippatsuEnabled: false,
  uraDoraEnabled: false,
  doubleRiichiEnabled: false,
  kuiTanEnabled: false,
  atoDuke: false,
  kiriage: false,
  localYaku: {
    ninhou: false,
    nagashiMangan: false,
    daisharinn: false,
    shiisanbudou: false,
    shireNkou: false,
  },
  customYaku: [],
};
