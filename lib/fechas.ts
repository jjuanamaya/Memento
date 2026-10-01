// Todo el sitio muestra fechas en hora argentina. Hace falta explicitarlo
// porque el servidor (Vercel) corre en UTC: sin esto, un pedido de las 22 h
// aparece como del día siguiente.
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** "YYYY-MM-DD" del instante dado, en hora argentina. */
export function claveDia(fecha: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(fecha);
}

/** Instante en que empieza (00:00 en Argentina) el día "YYYY-MM-DD". */
export function inicioDelDia(clave: string): Date {
  return new Date(`${clave}T00:00:00-03:00`);
}

/** Suma (o resta) días a una clave "YYYY-MM-DD". */
export function sumarDias(clave: string, dias: number): string {
  const mediodia = new Date(`${clave}T12:00:00-03:00`);
  return claveDia(new Date(mediodia.getTime() + dias * 86_400_000));
}

/** 0 = domingo … 6 = sábado, para una clave "YYYY-MM-DD". */
export function diaDeSemana(clave: string): number {
  return new Date(`${clave}T12:00:00-03:00`).getUTCDay();
}

/** "Lun 6" para una clave "YYYY-MM-DD". */
export function etiquetaCorta(clave: string): string {
  return `${DIAS[diaDeSemana(clave)]} ${Number(clave.slice(8, 10))}`;
}

/** Fecha de un timestamp (creado_en): "6/10/2026". */
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: ZONA_HORARIA });
}

/** Fecha y hora de un timestamp: "6/10/2026, 22:15". */
export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** Fecha de una columna tipo date ("2026-10-08"), sin correrse un día. */
export function formatearDia(clave: string): string {
  const [y, m, d] = clave.slice(0, 10).split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

export function formatoMoneda(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-AR")}`;
}
