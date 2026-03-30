"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",            label: "ホーム",   icon: "⌂" },
  { href: "/calculator",  label: "点数計算", icon: "算" },
  { href: "/table",       label: "早見表",   icon: "表" },
  { href: "/scoreboard",  label: "スコア表", icon: "記" },
  { href: "/quiz",        label: "クイズ",   icon: "？" },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav style={{
      position: "fixed", bottom: 0,
      left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "var(--bg-card)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "10px 2px 8px",
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--text-muted)",
              fontSize: "0.6rem",
              gap: 3,
              borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: active ? "bold" : "normal",
            }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
