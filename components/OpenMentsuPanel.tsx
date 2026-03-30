"use client";
import { useState } from "react";
import { Tile, ALL_TILES, TILE_LABEL, tileFromId } from "@/lib/tiles";
import { OpenMentsu, NakiType } from "@/lib/calculate";
import { TileButton } from "./TileButton";

interface Props {
  openMentsu: OpenMentsu[];
  onChange: (openMentsu: OpenMentsu[]) => void;
}

const NAKI_LABELS: Record<NakiType, string> = {
  chi: "チー",
  pon: "ポン",
  minkan: "明槓",
  ankan: "暗槓",
};

/** チーで鳴いた牌から取りうる形を全列挙 */
function getChiForms(stolen: Tile): { tiles: Tile[]; label: string }[] {
  if (stolen.type === "honor") return [];
  const n = stolen.number!;
  const t = stolen.type;
  const forms: { tiles: Tile[]; label: string }[] = [];
  // 鳴いた牌が左端（n, n+1, n+2）
  if (n <= 7) forms.push({
    tiles: [tileFromId(`${t}${n}`), tileFromId(`${t}${n + 1}`), tileFromId(`${t}${n + 2}`)],
    label: `${n}-${n + 1}-${n + 2}（左端取得）`,
  });
  // 鳴いた牌が中（n-1, n, n+1）
  if (n >= 2 && n <= 8) forms.push({
    tiles: [tileFromId(`${t}${n - 1}`), tileFromId(`${t}${n}`), tileFromId(`${t}${n + 1}`)],
    label: `${n - 1}-${n}-${n + 1}（中取得）`,
  });
  // 鳴いた牌が右端（n-2, n-1, n）
  if (n >= 3) forms.push({
    tiles: [tileFromId(`${t}${n - 2}`), tileFromId(`${t}${n - 1}`), tileFromId(`${t}${n}`)],
    label: `${n - 2}-${n - 1}-${n}（右端取得）`,
  });
  return forms;
}

/** 副露の概要表示 */
function mentsuLabel(om: OpenMentsu): string {
  const tileLabel = (t: import("@/lib/tiles").Tile) =>
    TILE_LABEL[t.isAka ? t.id.slice(0, -1) : t.id] ?? t.id;
  const desc = om.nakiType === "chi"
    ? om.tiles.map(tileLabel).join("-")
    : tileLabel(om.tiles[0]);
  return `${NAKI_LABELS[om.nakiType]}: ${desc}`;
}

export function OpenMentsuPanel({ openMentsu, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [nakiType, setNakiType] = useState<NakiType>("pon");
  // チー：鳴いた牌を選んだ後、形を選ぶ2ステップ
  const [chiStolen, setChiStolen] = useState<Tile | null>(null);

  const canAdd = openMentsu.length < 4;

  function cancel() {
    setAdding(false);
    setChiStolen(null);
  }

  function handleChiStolenSelect(tile: Tile) {
    const forms = getChiForms(tile);
    if (forms.length === 1) {
      // 形が1択なら即確定
      addMentsu(forms[0].tiles, "chi");
    } else {
      setChiStolen(tile);
    }
  }

  function addMentsu(tiles: Tile[], type: NakiType) {
    onChange([...openMentsu, { tiles, nakiType: type }]);
    setAdding(false);
    setChiStolen(null);
  }

  function handlePonKanSelect(tile: Tile) {
    const base = tileFromId(tile.type === "honor" ? tile.id : `${tile.type}${tile.number}`);
    const count = nakiType === "minkan" || nakiType === "ankan" ? 4 : 3;
    addMentsu(Array.from({ length: count }, () => base), nakiType);
  }

  function handleRemove(index: number) {
    onChange(openMentsu.filter((_, i) => i !== index));
  }

  const chiTiles = ALL_TILES.filter((t) => t.type !== "honor");

  return (
    <div className="card">
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8, fontWeight: "bold", letterSpacing: "0.05em" }}>
        副露（鳴き）
      </div>

      {/* 登録済み副露の一覧 */}
      {openMentsu.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {openMentsu.map((om, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(255,255,255,0.08)", borderRadius: 8,
              padding: "4px 8px", fontSize: "0.85rem",
            }}>
              <span>{mentsuLabel(om)}</span>
              <button
                onClick={() => handleRemove(i)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1, padding: 0 }}
                aria-label="削除"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* 副露追加UI */}
      {adding ? (
        <div>
          {/* 種別選択 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {(["chi", "pon", "minkan", "ankan"] as NakiType[]).map((t) => (
              <button
                key={t}
                className={`btn-ghost${nakiType === t ? " active" : ""}`}
                onClick={() => { setNakiType(t); setChiStolen(null); }}
              >
                {NAKI_LABELS[t]}
              </button>
            ))}
            <button className="btn-ghost" onClick={cancel} style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
              キャンセル
            </button>
          </div>

          {nakiType === "chi" ? (
            chiStolen ? (
              /* チー：形を選ぶ */
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  {TILE_LABEL[chiStolen.id] ?? chiStolen.id} を鳴いた形を選択（高め取り）
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {getChiForms(chiStolen).map((form, i) => (
                    <button
                      key={i}
                      className="btn-ghost"
                      style={{ textAlign: "left", padding: "8px 12px" }}
                      onClick={() => addMentsu(form.tiles, "chi")}
                    >
                      {form.label}
                    </button>
                  ))}
                </div>
                <button className="btn-ghost" style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--text-muted)" }} onClick={() => setChiStolen(null)}>
                  ← 牌を選び直す
                </button>
              </div>
            ) : (
              /* チー：鳴いた牌を選ぶ */
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>
                  鳴いた牌（相手が捨てた牌）を選択
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {chiTiles.map((tile) => (
                    <TileButton key={tile.id} tile={tile} onClick={handleChiStolenSelect} size="sm" />
                  ))}
                </div>
              </div>
            )
          ) : (
            /* ポン・槓：牌を選ぶ */
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>牌を選択</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ALL_TILES.map((tile) => (
                  <TileButton key={tile.id} tile={tile} onClick={handlePonKanSelect} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        canAdd && (
          <button className="btn-ghost" style={{ fontSize: "0.875rem" }} onClick={() => setAdding(true)}>
            ＋ 副露を追加
          </button>
        )
      )}

      {!canAdd && !adding && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>副露は最大4組まで</div>
      )}
    </div>
  );
}
