import type { SupabaseClient } from "@supabase/supabase-js";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO = 5 * 1024 * 1024;

export const ACCEPT_COMPROBANTE = TIPOS_PERMITIDOS.join(",");

/** Devuelve un mensaje de error si el archivo no sirve como comprobante, o null si está bien. */
export function errorComprobante(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type) || archivo.size > TAMANO_MAXIMO) {
    return "El comprobante tiene que ser una imagen (JPG, PNG o WEBP) o un PDF de hasta 5 MB.";
  }
  return null;
}

/**
 * Sube el comprobante a la carpeta del usuario y devuelve la ruta. La base
 * después verifica que el archivo exista y sea de quien hace el pedido.
 */
export async function subirComprobante(supabase: SupabaseClient, prefijo: string, archivo: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión.");

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const ruta = `${user.id}/${prefijo}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("comprobantes").upload(ruta, archivo);
  if (error) throw error;

  return ruta;
}

/** Borra un comprobante que quedó subido pero no se usó (por ejemplo, si el pedido falló). */
export async function borrarComprobante(supabase: SupabaseClient, ruta: string) {
  await supabase.storage.from("comprobantes").remove([ruta]);
}
