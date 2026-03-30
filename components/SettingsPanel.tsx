"use client";
import { CalcOptions } from "@/lib/calculate";
import { RuleSet } from "@/lib/rules";

interface Props {
  options: CalcOptions;
  rules: RuleSet;
  onChange: (options: CalcOptions) => void;
}

const KAZE = ["東", "南", "西", "北"];

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`btn-ghost${value ? " active" : ""}`}
      onClick={() => onChange(!value)}
    >
      {label}
    </button>
  );
}

function Counter({
  label, value, onChange, max = 4,
}: {
  label: string; value: number; onChange: (v: number) => void; max?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: "0.875rem", minWidth: 56 }}>{label}</span>
      <button
        className="btn-ghost"
        style={{ padding: "2px 10px" }}
        onClick={() => onChange(Math.max(0, value - 1))}
      >−</button>
      <span style={{ minWidth: 20, textAlign: "center", fontWeight: "bold" }}>{value}</span>
      <button
        className="btn-ghost"
        style={{ padding: "2px 10px" }}
        onClick={() => onChange(Math.min(max, value + 1))}
      >＋</button>
    </div>
  );
}

export function SettingsPanel({ options, rules, onChange }: Props) {
  const set = <K extends keyof CalcOptions>(key: K, val: CalcOptions[K]) =>
    onChange({ ...options, [key]: val });

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 場風・自風 */}
      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>場風</div>
        <div style={{ display: "flex", gap: 6 }}>
          {KAZE.map((k, i) => (
            <button
              key={i}
              className={`btn-ghost${options.bakaze === i + 1 ? " active" : ""}`}
              onClick={() => set("bakaze", i + 1)}
            >{k}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>自風</div>
        <div style={{ display: "flex", gap: 6 }}>
          {KAZE.map((k, i) => (
            <button
              key={i}
              className={`btn-ghost${options.jikaze === i + 1 ? " active" : ""}`}
              onClick={() => set("jikaze", i + 1)}
            >{k}</button>
          ))}
        </div>
      </div>

      {/* ロン/ツモ */}
      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>アガリ方</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={`btn-ghost${!options.isTsumo ? " active" : ""}`}
            onClick={() => set("isTsumo", false)}
          >ロン</button>
          <button
            className={`btn-ghost${options.isTsumo ? " active" : ""}`}
            onClick={() => set("isTsumo", true)}
          >ツモ</button>
        </div>
      </div>

      {/* フラグ */}
      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>特殊条件</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Toggle label="立直" value={options.isRiichi}
            onChange={(v) => {
              onChange({ ...options, isRiichi: v, isDoubleRiichi: v ? options.isDoubleRiichi : false, isIppatsu: v ? options.isIppatsu : false });
            }}
          />
          {options.isRiichi && rules.doubleRiichiEnabled && (
            <Toggle label="ダブ立直" value={options.isDoubleRiichi}
              onChange={(v) => set("isDoubleRiichi", v)}
            />
          )}
          {options.isRiichi && rules.ippatsuEnabled && (
            <Toggle label="一発" value={options.isIppatsu}
              onChange={(v) => set("isIppatsu", v)}
            />
          )}
          <Toggle label="嶺上" value={options.isRinshan}
            onChange={(v) => set("isRinshan", v)}
          />
          <Toggle label="海底/河底" value={options.isHaitei}
            onChange={(v) => set("isHaitei", v)}
          />
          <Toggle label="槍槓" value={options.isChangkan}
            onChange={(v) => onChange({ ...options, isChangkan: v, isTsumo: v ? false : options.isTsumo })}
          />
        </div>
      </div>

      {/* ドラ枚数 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Counter label="ドラ" value={options.doraCount}
          onChange={(v) => set("doraCount", v)}
        />
        {rules.akaDoraEnabled && (
          <Counter label="赤ドラ" value={options.akaDoraCount}
            onChange={(v) => set("akaDoraCount", v)}
          />
        )}
        {options.isRiichi && rules.uraDoraEnabled && (
          <Counter label="裏ドラ" value={options.uraDoraCount}
            onChange={(v) => set("uraDoraCount", v)}
          />
        )}
      </div>
    </div>
  );
}
