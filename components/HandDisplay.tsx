"use client";
import { Tile } from "@/lib/tiles";
import { OpenMentsu, NakiType } from "@/lib/calculate";
import { TileButton } from "./TileButton";

const NAKI_LABELS: Record<NakiType, string> = {
  chi: "チー",
  pon: "ポン",
  minkan: "明槓",
  ankan: "暗槓",
};

interface Props {
  tiles: Tile[];
  openMentsu: OpenMentsu[];
  onRemove: (index: number) => void;
  onReset: () => void;
}

export function HandDisplay({ tiles, openMentsu, onRemove, onReset }: Props) {
  const agariIndex = tiles.length - 1;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: "bold", color: "var(--accent)" }}>手牌</span>
        <button className="btn-ghost" onClick={onReset} style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
          リセット
        </button>
      </div>

      {tiles.length === 0 && openMentsu.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "8px 0" }}>
          牌を選んでください（14枚）
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-end" }}>
          {/* 門前手牌 */}
          {tiles.map((tile, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {i === agariIndex && (
                <span style={{ fontSize: "0.6rem", color: "var(--accent)", fontWeight: "bold" }}>
                  ツモ/ロン
                </span>
              )}
              <button
                onClick={() => onRemove(i)}
                style={{
                  border: i === agariIndex
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  borderRadius: 6,
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <TileButton tile={tile} onClick={() => onRemove(i)} size="md" />
              </button>
            </div>
          ))}

          {/* 副露 */}
          {openMentsu.map((om, mi) => (
            <div key={`open-${mi}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginLeft: 4 }}>
              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: "bold" }}>
                {NAKI_LABELS[om.nakiType]}
              </span>
              <div style={{
                display: "flex", gap: 2,
                padding: "2px 4px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.12)",
              }}>
                {om.tiles.map((tile, ti) => (
                  <TileButton key={ti} tile={tile} onClick={() => {}} size="md" disabled />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(tiles.length > 0 || openMentsu.length > 0) && (
        <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--text-muted)" }}>
          最後の牌がアガリ牌 — タップで削除
        </div>
      )}
    </div>
  );
}
