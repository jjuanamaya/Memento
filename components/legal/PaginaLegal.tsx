import { ULTIMA_ACTUALIZACION_LEGAL } from "@/lib/negocio";

export function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
      <p className="mt-2 text-sm text-muted">Última actualización: {ULTIMA_ACTUALIZACION_LEGAL}</p>
      <div className="mt-10 space-y-4 leading-relaxed text-muted [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
