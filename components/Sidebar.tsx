"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/checklist", label: "Checklist", icon: "✓" },
  { href: "/fornecedores", label: "Fornecedores", icon: "♦" },
  { href: "/pagamentos", label: "Pagamentos", icon: "◈" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)", width: 220, flexShrink: 0 }}
      className="flex flex-col h-full"
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="text-lg font-semibold" style={{ color: "var(--primary)" }}>
          💍 Nosso Casamento
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          Planejador
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--primary)" : "var(--foreground)",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
