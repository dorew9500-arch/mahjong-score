"use client";
import { useState } from "react";
import { Tile, ALL_TILES, TILE_LABEL, tileFromId } from "@/lib/tiles";
import { OpenMentsu, NakiType } from "@/lib/calculate";
import { TileButton } from "./TileButton";
import Image from "next/image";

interface Props {
  openMentsu: OpenMentsu[];
  onChange: (openMentsu: OpenMentsu[]) => void;
  noCard?: boolean;
  allowAdd?: boolean;
}

const NAKI_LABELS: Record<NakiType, string> = {
  chi: "チー",
  pon: "ポン",
  minkan: "明槓",
  ankan: "暗槓",
};

// 鳴いた牌（stolen）は常に tiles[0]（左端・横向き）、手牌2枚が続く
function getChiForms(stolen: Tile): { tiles: Tile[]; stolenIndex: number; label: string }[] {
  if (stolen.type === "honor") return [];
  const n = stolen.number!;
  const t = stolen.type;
  const forms: { tiles: Tile[]; stolenIndex: number; label: string }[] = [];
  // 手牌: n+1, n+2
  if (n <= 7) forms.push({
    tiles: [tileFromId(`${t}${n}`), tileFromId(`${t}${n + 1}`), tileFromId(`${t}${n + 2}`)],
    stolenIndex: 0,
    label: `手牌: ${n + 1}-${n + 2}`,
  });
  // 手牌: n-1, n+1
  if (n >= 2 && n <= 8) forms.push({
    tiles: [tileFromId(`${t}${n}`), tileFromId(`${t}${n - 1}`), tileFromId(`${t}${n + 1}`)],
    stolenIndex: 0,
    label: `手牌: ${n - 1}-${n + 1}`,
  });
  // 手牌: n-2, n-1
  if (n >= 3) forms.push({
    tiles: [tileFromId(`${t}${n}`), tileFromId(`${t}${n - 2}`), tileFromId(`${t}${n - 1}`)],
    stolenIndex: 0,
    label: `手牌: ${n - 2}-${n - 1}`,
  });
  return forms;
}

/** 副露を正確に表示するコンポーネント */
function MentsuTiles({ om }: { om: OpenMentsu }) {
  const tileSize = 24;

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
              <Image src="/tiles/Back.png" alt="back" width={tileSize} height={tileSize}
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

export function OpenMentsuPanel({ openMentsu, onChange, noCard, allowAdd = true }: Props) {
  const [adding, setAdding] = useState(false);
  const [nakiType, setNakiType] = useState<NakiType>("pon");
  const [chiStolen, setChiStolen] = useState<Tile | null>(null);
  // ポン/明槓: 牌選択後に「誰から？」ステップ
  const [pendingTile, setPendingTile] = useState<Tile | null>(null);

  const canAdd = openMentsu.length < 4 && allowAdd;

  function cancel() {
    setAdding(false);
    setChiStolen(null);
    setPendingTile(null);
  }

  function handleChiStolenSelect(tile: Tile) {
    const forms = getChiForms(tile);
    if (forms.length === 1) {
      addMentsu(forms[0].tiles, "chi", forms[0].stolenIndex);
    } else {
      setChiStolen(tile);
    }
  }

  function addMentsu(tiles: Tile[], type: NakiType, stolenIndex?: number) {
    onChange([...openMentsu, { tiles, nakiType: type, stolenIndex }]);
    setAdding(false);
    setChiStolen(null);
    setPendingTile(null);
  }

  function handlePonKanTileSelect(tile: Tile) {
    const base = tileFromId(tile.type === "honor" ? tile.id : `${tile.type}${tile.number}`);
    if (nakiType === "ankan") {
      // 暗槓は方向不要
      addMentsu(Array.from({ length: 4 }, () => base), "ankan", undefined);
    } else {
      setPendingTile(base);
    }
  }

  function handlePonKanDirection(stolenIndex: number) {
    if (!pendingTile) return;
    const count = nakiType === "minkan" ? 4 : 3;
    addMentsu(Array.from({ length: count }, () => pendingTile), nakiType, stolenIndex);
  }

  const chiTiles = ALL_TILES.filter((t) => t.type !== "honor" && !t.isAka);

  const inner = (
    <div style={{ padding: noCard ? 0 : "10px 12px" }}>
      {/* ヘッダー行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "bold", whiteSpace: "nowrap" }}>
          副露（鳴き）
        </span>
        {/* 削除ボタン */}
        {openMentsu.map((om, i) => (
          <button key={i}
            onClick={() => onChange(openMentsu.filter((_, j) => j !== i))}
            className="btn-ghost"
            style={{ fontSize: "0.75rem", padding: "2px 8px", color: "var(--text-muted)" }}
          >
            {NAKI_LABELS[om.nakiType]} ×
          </button>
        ))}
        {canAdd && !adding && (
          <button
            className="btn-ghost"
            style={{ fontSize: "0.8rem", padding: "3px 10px" }}
            onClick={() => setAdding(true)}
          >
            ＋ 鳴き追加
          </button>
        )}
      </div>

      {/* 追加UI */}
      {adding && (
        <div style={{ marginTop: 10 }}>
          {/* 種別クイックバー */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 10 }}>
            {(["chi", "pon", "minkan", "ankan"] as NakiType[]).map((t) => (
              <button
                key={t}
                className={`btn-ghost${nakiType === t ? " active" : ""}`}
                style={{ fontSize: "0.85rem", padding: "5px 12px" }}
                onClick={() => { setNakiType(t); setChiStolen(null); setPendingTile(null); }}
              >
                {NAKI_LABELS[t]}
              </button>
            ))}
            <button
              className="btn-ghost"
              style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "4px 10px", color: "var(--text-muted)" }}
              onClick={cancel}
            >
              キャンセル
            </button>
          </div>

          {nakiType === "chi" ? (
            chiStolen ? (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  {TILE_LABEL[chiStolen.id] ?? chiStolen.id} の形を選択
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {getChiForms(chiStolen).map((form, i) => (
                    <button
                      key={i}
                      className="btn-ghost"
                      style={{ padding: "6px 14px" }}
                      onClick={() => addMentsu(form.tiles, "chi", form.stolenIndex)}
                    >
                      {form.label}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-ghost"
                  style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}
                  onClick={() => setChiStolen(null)}
                >
                  ← 戻る
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>
                  相手が捨てた牌を選択
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {chiTiles.map((tile) => (
                    <TileButton key={tile.id} tile={tile} onClick={handleChiStolenSelect} size="sm" />
                  ))}
                </div>
              </div>
            )
          ) : pendingTile ? (
            /* ポン/明槓：誰から鳴いた？ */
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>
                誰から鳴きましたか？
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "上家（左）", index: 0 },
                  { label: "対面", index: nakiType === "minkan" ? 2 : 1 },
                  { label: "下家（右）", index: nakiType === "minkan" ? 3 : 2 },
                ].map(({ label, index }) => (
                  <button
                    key={label}
                    className="btn-ghost"
                    style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                    onClick={() => handlePonKanDirection(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="btn-ghost"
                style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}
                onClick={() => setPendingTile(null)}
              >
                ← 戻る
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>
                牌を選択
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {ALL_TILES.filter((t) => !t.isAka).map((tile) => (
                  <TileButton key={tile.id} tile={tile} onClick={handlePonKanTileSelect} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
  if (noCard) return inner;
  return <div className="card">{inner}</div>;
}
