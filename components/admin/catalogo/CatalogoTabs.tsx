"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/catalogo", label: "Cajas" },
  { href: "/admin/catalogo/tematicas", label: "Temáticas" },
  { href: "/admin/catalogo/frecuencias", label: "Frecuencias de envío" },
  { href: "/admin/catalogo/zonas", label: "Zonas de reparto" },
];

export function CatalogoTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const activo = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
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
