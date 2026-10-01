import Link from "next/link";
import { LINK_DEFENSA_CONSUMIDOR, NEGOCIO, dato } from "@/lib/negocio";

const LINKS_LEGALES = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/cookies", label: "Política de cookies" },
  { href: "/cambios-y-devoluciones", label: "Cambios y devoluciones" },
  { href: "/arrepentimiento", label: "Botón de arrepentimiento" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold tracking-wide text-foreground">MEMENTO</p>
          <p className="mt-2 text-muted">Cajas de regalo en {NEGOCIO.localidad.split(",")[0]}.</p>
        </div>

        <nav aria-label="Información legal">
          <p className="font-semibold text-foreground">Legales</p>
          <ul className="mt-3 space-y-2">
            {LINKS_LEGALES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-semibold text-foreground">Datos del negocio</p>
          <ul className="mt-3 space-y-1 text-muted">
            <li>Titular: {dato(NEGOCIO.titular)}</li>
            <li>CUIT: {dato(NEGOCIO.cuit)}</li>
            <li>
              {dato(NEGOCIO.domicilio)}, {NEGOCIO.localidad}
            </li>
            <li>Email: {dato(NEGOCIO.email)}</li>
            <li>Teléfono: {dato(NEGOCIO.telefono)}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-6 text-sm sm:flex-row sm:items-center">
          <a
            href={LINK_DEFENSA_CONSUMIDOR}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Defensa de las y los Consumidores. Para reclamos ingrese aquí
          </a>
          <div className="flex items-center gap-4">
            {NEGOCIO.dataFiscalUrl && NEGOCIO.dataFiscalImagenUrl && (
              <a href={NEGOCIO.dataFiscalUrl} target="_blank" rel="noopener noreferrer">
                <img src={NEGOCIO.dataFiscalImagenUrl} alt="Data Fiscal (ARCA)" className="h-12 w-auto" />
              </a>
            )}
            <span className="text-muted">© {new Date().getFullYear()} Memento</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
