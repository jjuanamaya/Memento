"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/admin/ui/Modal";
import type { Proveedor } from "@/lib/types";

interface ProveedorFormProps {
  proveedor?: Proveedor;
  onClose: () => void;
  onSaved: (proveedor: Proveedor) => void;
}

export function ProveedorForm({ proveedor, onClose, onSaved }: ProveedorFormProps) {
  const esEdicion = !!proveedor;

  const [nombre, setNombre] = useState(proveedor?.nombre ?? "");
  const [contacto, setContacto] = useState(proveedor?.contacto ?? "");
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? "");
  const [email, setEmail] = useState(proveedor?.email ?? "");
  const [direccion, setDireccion] = useState(proveedor?.direccion ?? "");
  const [notas, setNotas] = useState(proveedor?.notas ?? "");
  const [activo, setActivo] = useState(proveedor?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    const payload = {
      nombre: nombre.trim(),
      contacto: contacto.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
      notas: notas.trim() || null,
      activo,
    };

    const resultado = esEdicion
      ? await supabase.from("proveedores").update(payload).eq("id", proveedor!.id).select().single()
      : await supabase.from("proveedores").insert(payload).select().single();

    setGuardando(false);

    if (resultado.error || !resultado.data) {
      setError("No se pudo guardar el proveedor. Probá de nuevo.");
      return;
    }

    onSaved(resultado.data as Proveedor);
  }

  return (
    <Modal titulo={esEdicion ? "Editar proveedor" : "Nuevo proveedor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Persona de contacto</label>
          <input
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Dirección</label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-muted/70 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" />
          Proveedor activo
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-muted/70 px-4 py-2 text-sm font-medium hover:border-brand/40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
