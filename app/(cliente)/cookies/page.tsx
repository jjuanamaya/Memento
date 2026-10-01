import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";

export const metadata: Metadata = { title: "Política de cookies — Memento" };

export default function CookiesPage() {
  return (
    <PaginaLegal titulo="Política de cookies">
      <p>
        Las cookies son pequeños archivos que un sitio guarda en tu navegador. Acá te contamos cuáles usamos y para qué.
      </p>

      <h2>Qué cookies usamos</h2>
      <p>
        Usamos <strong>únicamente cookies necesarias</strong>: sin ellas no podrías iniciar sesión ni comprar.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Cookies que usa el sitio</caption>
          <thead className="bg-surface text-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">Nombre</th>
              <th scope="col" className="px-4 py-3">Para qué sirve</th>
              <th scope="col" className="px-4 py-3">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border align-top">
              <td className="px-4 py-3 font-mono text-xs">sb-…-auth-token</td>
              <td className="px-4 py-3">
                Mantiene tu sesión iniciada de forma segura (la crea Supabase, nuestro proveedor de inicio de sesión).
              </td>
              <td className="px-4 py-3">Hasta que cerrás sesión (como máximo 400 días)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Si navegás el sitio sin iniciar sesión, no guardamos ninguna cookie.</p>

      <h2>Qué cookies NO usamos</h2>
      <ul>
        <li>No usamos cookies de analítica ni de medición de visitas.</li>
        <li>No usamos cookies de publicidad ni de seguimiento entre sitios.</li>
        <li>No usamos píxeles ni herramientas de redes sociales.</li>
      </ul>
      <p>
        Por eso no te mostramos un cartel para aceptar cookies: las únicas que usamos son las indispensables para que el
        sitio funcione. Si en el futuro sumamos otro tipo de cookies, te vamos a pedir permiso antes.
      </p>

      <h2>Cómo borrarlas</h2>
      <p>
        Al cerrar sesión la cookie se elimina. También podés borrarla desde la configuración de tu navegador, pero vas a
        tener que volver a iniciar sesión.
      </p>

      <p>
        Para saber cómo tratamos tus datos, mirá la <Link href="/privacidad">Política de privacidad</Link>.
      </p>
    </PaginaLegal>
  );
}
