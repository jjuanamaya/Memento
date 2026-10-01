import type { SupabaseClient } from "@supabase/supabase-js";

export function telefonoValido(telefono: string) {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15;
}

/** Guarda el teléfono en el perfil para que el admin pueda coordinar la entrega. */
export async function guardarTelefono(supabase: SupabaseClient, telefono: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("perfiles").update({ telefono: telefono.trim() }).eq("id", user.id);
  if (error) console.error("No se pudo guardar el teléfono:", error);
}
