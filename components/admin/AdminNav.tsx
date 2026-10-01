"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/suscripciones", label: "Suscripciones" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/catalogo", label: "Catálogo" },
];

function estaActivo(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminNav({ nombre }: { nombre: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  return (
    <header className="relative z-50 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
          <span className="text-lg">🎁</span>
          Memento · Admin
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 transition-colors ${
                estaActivo(pathname, link.href)
                  ? "bg-brand/15 font-medium text-brand"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 text-sm md:flex">
          <Link
            href="/"
            className="rounded-lg border border-border px-3 py-1.5 text-muted transition-colors hover:border-brand/40 hover:text-foreground"
          >
            ← Ver tienda
          </Link>
          {nombre && <span className="text-muted">Hola, {nombre}</span>}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-brand px-3 py-1.5 font-medium text-brand-foreground transition-opacity hover:opacity-90"
            >
              Salir
            </button>
          </form>
        </div>

        <button
          aria-label="Abrir menú"
          onClick={() => setAbierto((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border md:hidden"
        >
          <span className="sr-only">Menú</span>
          <div className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-foreground" />
            <span className="block h-0.5 w-5 bg-foreground" />
            <span className="block h-0.5 w-5 bg-foreground" />
          </div>
        </button>
      </div>

      {abierto && (
        <>
          <button
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 md:hidden"
          />
          <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-lg md:hidden">
            <nav className="flex flex-col gap-1 px-6 py-4 text-sm">
              {nombre && <p className="px-2 pb-2 text-xs text-muted">Hola, {nombre}</p>}
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setAbierto(false)}
                  className={`rounded-lg px-2 py-3 transition-colors ${
                    estaActivo(pathname, link.href)
                      ? "bg-brand/15 font-medium text-brand"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              <Link
                href="/"
                onClick={() => setAbierto(false)}
                className="rounded-lg px-2 py-3 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                ← Ver tienda
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-lg px-2 py-3 text-left font-medium text-brand transition-colors hover:bg-surface"
                >
                  Salir de la cuenta
                </button>
              </form>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
