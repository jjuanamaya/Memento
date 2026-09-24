import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/suscripciones", label: "Suscripciones" },
  { href: "/admin/stock", label: "Stock" },
];

export function AdminNav() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/admin" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Memento · Admin
        </Link>
        <nav className="flex gap-6 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
