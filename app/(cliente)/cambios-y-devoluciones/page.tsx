import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { NEGOCIO, dato } from "@/lib/negocio";

export const metadata: Metadata = { title: "Cambios, devoluciones y reembolsos — Memento" };

export default function CambiosPage() {
  return (
    <PaginaLegal titulo="Cambios, devoluciones y reembolsos">
      <h2>1. Derecho de arrepentimiento</h2>
      <p>
        Como compraste a distancia (por internet), tenés derecho a <strong>revocar la compra dentro de los 10 días
        corridos</strong> desde que recibiste el pedido o desde que lo confirmaste, lo que ocurra último, sin dar
        explicaciones y sin costo (artículo 34 de la Ley 24.240 y artículos 1110 a 1116 del Código Civil y Comercial).
      </p>
      <p>
        Podés pedirlo desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>, sin necesidad de
        registrarte. Al enviarlo recibís en el momento un código para seguir tu solicitud.
      </p>
      <ul>
        <li>
          <strong>Si tu caja todavía no fue preparada:</strong> cancelamos el pedido y te devolvemos el 100% de lo que
          hayas pagado.
        </li>
        <li>
          <strong>Si ya la recibiste:</strong> la ley excluye del derecho de arrepentimiento los productos que pueden
          deteriorarse rápido (como alimentos y bebidas) y los armados según tus especificaciones (artículo 1116 del
          Código Civil y Comercial). Igual, escribinos: si los productos están cerrados y en buen estado, buscamos una
          solución.
        </li>
        <li>Si hay que retirar productos, el costo de la devolución corre por nuestra cuenta.</li>
      </ul>

      <h2>2. Productos en mal estado o pedido equivocado</h2>
      <p>
        Si algún producto llegó dañado, vencido, en mal estado o distinto de lo que pediste, avisanos apenas lo notes a{" "}
        {dato(NEGOCIO.email)}, idealmente con una foto. Te ofrecemos reemplazarlo o devolverte el dinero de ese
        producto, a tu elección.
      </p>

      <h2>3. Cómo te devolvemos el dinero</h2>
      <p>
        Si pagaste por transferencia, te devolvemos el monto por transferencia a la cuenta que nos indiques. Si pagaste en
        efectivo, por transferencia o en efectivo, como prefieras. Lo hacemos una vez confirmada la solicitud.
      </p>

      <h2>4. Suscripciones</h2>
      <p>
        Podés cancelar tu suscripción cuando quieras y sin costo desde &quot;Mis suscripciones&quot;. La cancelación
        evita las próximas entregas. Las entregas ya enviadas siguen las mismas reglas de esta política.
      </p>

      <h2>5. ¿Dudas?</h2>
      <p>
        Escribinos a {dato(NEGOCIO.email)} o llamanos al {dato(NEGOCIO.telefono)}. Más información en los{" "}
        <Link href="/terminos">Términos y condiciones</Link>.
      </p>
    </PaginaLegal>
  );
}
