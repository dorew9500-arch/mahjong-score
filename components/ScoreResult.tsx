"use client";
import { useState } from "react";
import { CalcResult, scoreRankName } from "@/lib/calculate";

const YAKU_READING: Record<string, string> = {
  // 通常役
  "立直":       "リーチ",
  "ダブル立直": "ダブルリーチ",
  "一発":       "イッパツ",
  "門前清自摸和": "メンゼンツモ",
  "平和":       "ピンフ",
  "断么九":     "タンヤオ",
  "一盃口":     "イーペーコー",
  "二盃口":     "リャンペーコー",
  "槍槓":       "チャンカン",
  "嶺上開花":   "リンシャンカイホウ",
  "海底摸月":   "ハイテイモーユー",
  "河底撈魚":   "ホーテイラオユー",
  "三色同順":   "サンショクドウジュン",
  "一気通貫":   "イッキツーカン",
  "混全帯么九": "チャンタ",
  "純全帯么九": "ジュンチャン",
  "対々和":     "トイトイ",
  "三暗刻":     "サンアンコー",
  "三色同刻":   "サンショクドウコウ",
  "混老頭":     "ホンロウトウ",
  "小三元":     "ショウサンゲン",
  "混一色":     "ホンイツ",
  "清一色":     "チンイツ",
  "七対子":     "チートイツ",
  // 役牌
  "白":         "ハク",
  "發":         "ハツ",
  "中":         "チュン",
  "場風牌":     "バカゼハイ",
  "自風牌":     "ジカゼハイ",
  // 役満
  "天和":       "テンホウ",
  "地和":       "チーホウ",
  "人和":       "レンホウ",
  "国士無双":   "コクシムソウ",
  "十三不搭":   "コクシムソウ（13面）",
  "四暗刻":     "スーアンコウ",
  "大三元":     "ダイサンゲン",
  "小四喜":     "ショウスーシー",
  "大四喜":     "ダイスーシー",
  "字一色":     "ツーイーソー",
  "緑一色":     "リューイーソー",
  "清老頭":     "チンロウトウ",
  "九蓮宝燈":   "チューレンポウトウ",
  "四槓子":     "スーカンツ",
  "四連刻":     "スーレンコウ",
  "大車輪":     "ダイシャリン",
  "流し満貫":   "ナガシマンガン",
};

function yakuReading(name: string): string | undefined {
  if (YAKU_READING[name]) return YAKU_READING[name];
  // ドラ系（"ドラ2" など）
  if (/^ドラ\d+$/.test(name)) return "ドラ";
  if (/^赤ドラ\d+$/.test(name)) return "アカドラ";
  if (/^裏ドラ\d+$/.test(name)) return "ウラドラ";
  return undefined;
}

interface Props {
  result: CalcResult;
  isDealer: boolean;
  isTsumo: boolean;
}

export function ScoreResult({ result, isDealer, isTsumo }: Props) {
  const [showFuDetail, setShowFuDetail] = useState(false);

  if (result.error) {
    return (
      <div className="card" style={{ borderColor: "#c0392b" }}>
        <div style={{ color: "#e74c3c", fontWeight: "bold", marginBottom: 4 }}>アガれません</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{result.error}</div>
      </div>
    );
  }

  const rankName = result.isYakuman
    ? `${result.yakumanCount > 1 ? result.yakumanCount + "倍" : ""}役満`
    : scoreRankName(result.han, result.fu);

  // 表示する点数
  const scoreLines: string[] = [];
  if (isTsumo && result.score.tsumo) {
    const t = result.score.tsumo;
    if (isDealer) {
      scoreLines.push(`ツモ: 全員から ${t.other.toLocaleString()}点`);
      scoreLines.push(`合計: ${(t.other * 3).toLocaleString()}点`);
    } else {
      scoreLines.push(`ツモ: 親 ${t.dealer.toLocaleString()}点 / 子 ${t.other.toLocaleString()}点`);
      scoreLines.push(`合計: ${(t.dealer + t.other * 2).toLocaleString()}点`);
    }
  } else if (!isTsumo && result.score.ron != null) {
    scoreLines.push(`ロン: ${result.score.ron.toLocaleString()}点`);
  }

  return (
    <div className="card">
      {/* ヘッダー：翻・符・ランク */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--accent)" }}>
          {scoreLines[0]}
        </div>
        {scoreLines[1] && (
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{scoreLines[1]}</div>
        )}
      </div>

      {/* 翻・符・ランク */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        {rankName && (
          <div style={{
            background: "var(--accent)", color: "#1a1a1a",
            borderRadius: 6, padding: "4px 12px", fontWeight: "bold", fontSize: "0.9rem",
          }}>
            {rankName}
          </div>
        )}
        <div style={{ fontSize: "0.9rem" }}>
          <span style={{ color: "var(--text-muted)" }}>翻: </span>
          <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{result.han}</span>
        </div>
        {!result.isYakuman && result.fu > 0 && (
          <div style={{ fontSize: "0.9rem" }}>
            <span style={{ color: "var(--text-muted)" }}>符: </span>
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{result.fu}</span>
          </div>
        )}
      </div>

      {/* 役一覧 */}
      <div style={{ marginBottom: 12 }}>
        {result.yaku.map((y, i) => {
          const reading = yakuReading(y.name);
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "5px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: "0.875rem" }}>{y.name}</span>
                {reading && (
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{reading}</span>
                )}
              </div>
              <span style={{ color: "var(--accent)", fontWeight: "bold", fontSize: "0.875rem" }}>
                {y.han === 0 ? "役満" : `${y.han}翻`}
              </span>
            </div>
          );
        })}
        {result.customYakuApplied.map((y, i) => {
          const reading = yakuReading(y.name);
          return (
            <div key={`c${i}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "5px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: "0.875rem", color: "var(--accent-hover)" }}>{y.name} ★</span>
                {reading && (
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{reading}</span>
                )}
              </div>
              <span style={{ color: "var(--accent)", fontWeight: "bold", fontSize: "0.875rem" }}>
                {y.han === 0 ? "役満" : `${y.han}翻`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 符内訳（アコーディオン） */}
      {result.fuDetail.length > 0 && (
        <div>
          <button
            className="btn-ghost"
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            onClick={() => setShowFuDetail(!showFuDetail)}
          >
            {showFuDetail ? "▲" : "▼"} 符内訳
          </button>
          {showFuDetail && (
            <div style={{ marginTop: 8, padding: 10, background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              {result.fuDetail.map((d, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "0.8rem", padding: "2px 0",
                }}>
                  <span style={{ color: "var(--text-muted)" }}>{d.name}</span>
                  <span>{d.fu}符</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontWeight: "bold", padding: "4px 0", marginTop: 4,
                borderTop: "1px solid var(--border)",
              }}>
                <span>合計</span>
                <span>{result.fu}符</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
