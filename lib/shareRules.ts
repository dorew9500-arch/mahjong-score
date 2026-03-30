import { RuleSet, freeRule } from "./rules";

/**
 * RuleSetをBase64エンコードしてURLパラメータ用文字列に変換
 */
export function encodeRuleSet(rules: RuleSet): string {
  const json = JSON.stringify(rules);
  // ブラウザ環境・Node環境どちらでも動くようにBuffer/btoaを切り替え
  if (typeof btoa !== "undefined") {
    return btoa(encodeURIComponent(json));
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

/**
 * URLパラメータ文字列からRuleSetを復元
 */
export function decodeRuleSet(encoded: string): RuleSet | null {
  try {
    let json: string;
    if (typeof atob !== "undefined") {
      json = decodeURIComponent(atob(encoded));
    } else {
      json = Buffer.from(encoded, "base64").toString("utf-8");
    }
    return JSON.parse(json) as RuleSet;
  } catch {
    return null;
  }
}

/**
 * 現在のRuleSetを共有URLに変換
 * @param rules ルールセット
 * @param baseUrl ベースURL（デフォルト: window.location.origin）
 */
export function buildShareUrl(rules: RuleSet, baseUrl?: string): string {
  const origin =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const encoded = encodeRuleSet(rules);
  return `${origin}/?rules=${encodeURIComponent(encoded)}`;
}

/**
 * URLからルールセットを読み込む
 * 存在しない・不正な場合はfreeRuleを返す
 */
export function loadRulesFromUrl(search: string): RuleSet {
  const params = new URLSearchParams(search);
  const encoded = params.get("rules");
  if (!encoded) return freeRule;
  return decodeRuleSet(encoded) ?? freeRule;
}
