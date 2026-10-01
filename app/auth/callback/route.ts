import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaInterna } from "@/lib/rutaSegura";

// Supabase vuelve acá desde los emails (confirmar cuenta, restablecer
// contraseña) con un "code" que se canjea por la sesión del usuario.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const destino = rutaInterna(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
