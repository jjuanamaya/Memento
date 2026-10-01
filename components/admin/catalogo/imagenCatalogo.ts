import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "catalogo";
const MARCADOR_PATH = `/storage/v1/object/public/${BUCKET}/`;

export function extraerPathStorage(url: string): string | null {
  const idx = url.indexOf(MARCADOR_PATH);
  if (idx === -1) return null;
  return url.slice(idx + MARCADOR_PATH.length);
}

export async function subirImagenCatalogo(
  supabase: SupabaseClient,
  archivo: File,
  carpeta: string
): Promise<string> {
  const extension = archivo.name.split(".").pop() || "jpg";
  const path = `${carpeta}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, archivo);
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function borrarImagenCatalogo(supabase: SupabaseClient, url: string) {
  const path = extraerPathStorage(url);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
