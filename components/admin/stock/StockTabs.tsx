"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/stock", label: "Productos" },
  { href: "/admin/stock/movimientos", label: "Movimientos" },
  { href: "/admin/stock/proveedores", label: "Proveedores" },
];

export function StockTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2 border-b border-border">
      {tabs.map((tab) => {
        const activo = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activo ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
