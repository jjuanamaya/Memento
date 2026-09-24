import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/site/Nav";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nombre: string | null = null;
  let esAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("nombre, rol")
      .eq("id", user.id)
      .single();
    nombre = perfil?.nombre ?? null;
    esAdmin = perfil?.rol === "admin";
  }

  return (
    <header className="relative border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-wide uppercase">
          Memento
        </Link>
        <Nav logueado={!!user} nombre={nombre} esAdmin={esAdmin} />
      </div>
    </header>
  );
}
