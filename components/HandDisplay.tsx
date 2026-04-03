"use client";
import { useState } from "react";
import { Tile } from "@/lib/tiles";
import { OpenMentsu, NakiType } from "@/lib/calculate";
import { TileButton } from "./TileButton";
import { OpenMentsuPanel } from "./OpenMentsuPanel";
import Image from "next/image";

const NAKI_LABELS: Record<NakiType, string> = {
  chi: "チー",
  pon: "ポン",
  minkan: "明槓",
  ankan: "暗槓",
};

function MentsuTiles({ om }: { om: OpenMentsu }) {
  if (om.nakiType === "ankan") {
    // 暗槓: [裏][表][表][裏]
    return (
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        {om.tiles.map((tile, i) => {
          const isOuter = i === 0 || i === 3;
          return isOuter ? (
            <div key={i} style={{
              background: "#fff", border: "1px solid rgba(0,0,0,0.25)", borderRadius: 4,
              padding: 1, display: "inline-flex", boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}>
              <Image src="/tiles/Back.png" alt="back" width={24} height={24}
                style={{ display: "block", borderRadius: 2 }} draggable={false} />
            </div>
          ) : (
            <TileButton key={i} tile={tile} onClick={() => {}} size="sm" displayOnly />
          );
        })}
      </div>
    );
  }
  // チー・ポン・明槓: tiles[stolenIndex] を横向き（stolenIndex=0 なら左端）
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {om.tiles.map((tile, i) => {
        const isStolen = i === om.stolenIndex;
        return (
          <div key={i} style={{
            transform: isStolen ? "rotate(90deg)" : undefined,
            display: "inline-flex",
            flexShrink: 0,
          }}>
            <TileButton tile={tile} onClick={() => {}} size="sm" displayOnly />
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  tiles: Tile[];
  openMentsu: OpenMentsu[];
  onRemove: (index: number) => void;
  onReset: () => void;
  onReorder?: (tiles: Tile[]) => void;
  onOpenMentsuChange?: (mentsu: OpenMentsu[]) => void;
  showAgariMark?: boolean;
}

export function HandDisplay({ tiles, openMentsu, onRemove, onReset, onReorder, onOpenMentsuChange, showAgariMark = true }: Props) {
  const agariIndex = showAgariMark ? tiles.length - 1 : -1;
  const [sortMode, setSortMode] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  function handleTileClick(i: number) {
    if (sortMode && onReorder) {
      if (i === agariIndex) { setSelectedIdx(null); return; } // アガリ牌は固定
      if (selectedIdx === null) {
        setSelectedIdx(i);
      } else {
        if (selectedIdx !== i) {
          const next = [...tiles];
          [next[selectedIdx], next[i]] = [next[i], next[selectedIdx]];
          onReorder(next);
        }
        setSelectedIdx(null);
      }
    } else {
      onRemove(i);
    }
  }

  function toggleSortMode() {
    setSortMode((v) => !v);
    setSelectedIdx(null);
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: "bold", color: "var(--accent)" }}>手牌</span>
        <div style={{ display: "flex", gap: 6 }}>
          {onReorder && tiles.length > 1 && (
            <button className={`btn-ghost${sortMode ? " active" : ""}`} onClick={toggleSortMode} style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
              {sortMode ? (selectedIdx !== null ? "移動先を選択" : "並び替え中") : "並び替え"}
            </button>
          )}
          <button className="btn-ghost" onClick={onReset} style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
            リセット
          </button>
        </div>
      </div>

      {tiles.length === 0 && openMentsu.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "8px 0" }}>
          手牌を入力してください
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "nowrap", gap: 2, alignItems: "flex-end", overflowX: "auto" }}>
          {/* 門前手牌 */}
          {tiles.map((tile, i) => {
            const isAgari = i === agariIndex;
            const isSelected = sortMode && selectedIdx === i;
            const isFixed = sortMode && isAgari;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                {isAgari && (
                  <span style={{ fontSize: "0.55rem", color: "var(--accent)", fontWeight: "bold", lineHeight: 1 }}>
                    上がり
                  </span>
                )}
                <div style={{
                  border: isSelected
                    ? "2px solid #f1c40f"
                    : isAgari
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  borderRadius: 4,
                  opacity: isFixed ? 0.5 : 1,
                  cursor: sortMode ? (isFixed ? "default" : "pointer") : undefined,
                }}>
                  <TileButton tile={tile} onClick={() => handleTileClick(i)} size="sm" />
                </div>
              </div>
            );
          })}

          {/* 副露 */}
          {openMentsu.map((om, mi) => (
            <div key={`open-${mi}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginLeft: 6 }}>
              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: "bold" }}>
                {NAKI_LABELS[om.nakiType]}
              </span>
              <MentsuTiles om={om} />
            </div>
          ))}
        </div>
      )}

      {(tiles.length > 0 || openMentsu.length > 0) && (
        <div style={{ marginTop: 6, fontSize: "0.65rem", color: "var(--text-muted)" }}>
          最後の牌がアガリ牌 — タップで削除
        </div>
      )}

      {onOpenMentsuChange && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {(() => {
            // 副露追加できるのは、追加後も手牌が収まる場合のみ（手牌3枚以上余裕がある）
            const openTiles = openMentsu.reduce((sum, m) => sum + m.tiles.length, 0);
            const allowAdd = tiles.length <= 14 - openTiles - 3;
            return <OpenMentsuPanel openMentsu={openMentsu} onChange={onOpenMentsuChange} noCard allowAdd={allowAdd} />;
          })()}
        </div>
      )}
    </div>
  );
}
