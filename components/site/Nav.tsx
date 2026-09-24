"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/armar", label: "Armar mi caja" },
  { href: "/suscribirse", label: "Suscribirme" },
  { href: "/mis-pedidos", label: "Mis pedidos" },
  { href: "/mis-suscripciones", label: "Mis suscripciones" },
];

export function Nav({
  logueado,
  nombre,
  esAdmin,
}: {
  logueado: boolean;
  nombre: string | null;
  esAdmin: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
            {link.label}
          </Link>
        ))}
        {esAdmin && (
          <Link href="/admin" className="font-medium text-brand transition-opacity hover:opacity-80">
            Admin
          </Link>
        )}
        {logueado ? (
          <div className="flex items-center gap-4">
            <span>Hola, {nombre || "vos"}</span>
            <form action={signOut}>
              <button type="submit" className="transition-colors hover:text-foreground">
                Salir
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-brand px-4 py-2 font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            Ingresar
          </Link>
        )}
      </nav>

      <button
        aria-label="Abrir menú"
        onClick={() => setAbierto((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border sm:hidden"
      >
        <span className="sr-only">Menú</span>
        <div className="flex flex-col gap-1">
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
        </div>
      </button>

      {abierto && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background sm:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4 text-sm text-muted">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAbierto(false)}
                className="rounded-lg px-2 py-3 transition-colors hover:bg-surface hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {esAdmin && (
              <Link
                href="/admin"
                onClick={() => setAbierto(false)}
                className="rounded-lg px-2 py-3 font-medium text-brand transition-colors hover:bg-surface"
              >
                Admin
              </Link>
            )}
            {logueado ? (
              <>
                <span className="px-2 py-2">Hola, {nombre || "vos"}</span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-lg px-2 py-3 text-left transition-colors hover:bg-surface hover:text-foreground"
                  >
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setAbierto(false)}
                className="mt-2 rounded-full bg-brand px-4 py-2 text-center font-medium text-brand-foreground"
              >
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
