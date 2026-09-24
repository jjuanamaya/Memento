import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();

  if (perfil?.rol !== "admin") redirect("/");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="print:hidden">
        <AdminNav />
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
