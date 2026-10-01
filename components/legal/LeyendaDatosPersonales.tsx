import Link from "next/link";
import { LINK_AAIP } from "@/lib/negocio";

// Leyendas obligatorias de la Disposición 10/2008 (Ley 25.326) para
// formularios que recolectan datos personales.
export function LeyendaDatosPersonales() {
  return (
    <div className="space-y-2 text-[11px] leading-relaxed text-muted">
      <p>
        Usamos estos datos solo para lo que se explica en la{" "}
        <Link href="/privacidad" className="text-brand underline underline-offset-2">
          Política de privacidad
        </Link>
        .
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme
        lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.
      </p>
      <p>
        La{" "}
        <a href={LINK_AAIP} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">
          Agencia de Acceso a la Información Pública
        </a>
        , en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y
        reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en
        materia de protección de datos personales.
      </p>
    </div>
  );
}
