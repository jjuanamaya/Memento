import type { Metadata } from "next";
import { RecuperarForm } from "@/components/cliente/RecuperarForm";

export const metadata: Metadata = { title: "Recuperar contraseña — Memento" };

export default function RecuperarPage() {
  return <RecuperarForm />;
}
