/** Solo acepta rutas internas ("/armar"), para que un link no pueda mandar a otro sitio. */
export function rutaInterna(destino: string | string[] | null | undefined, porDefecto = "/") {
  const valor = Array.isArray(destino) ? destino[0] : destino;
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return porDefecto;
  return valor;
}
