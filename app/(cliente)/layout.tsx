import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Res. 424/2020: acceso directo y visible desde la página de inicio */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl justify-end px-6 py-2">
          <Link
            href="/arrepentimiento"
            className="rounded-full border border-brand/60 px-3 py-1 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
          >
            Botón de arrepentimiento
          </Link>
        </div>
      </div>
      <Header />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
