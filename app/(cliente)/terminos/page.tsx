import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { LINK_DEFENSA_CONSUMIDOR, NEGOCIO, dato } from "@/lib/negocio";

export const metadata: Metadata = { title: "Términos y condiciones — Memento" };

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos y condiciones">
      <p>
        Estos términos regulan el uso del sitio de <strong>{NEGOCIO.nombreComercial}</strong> y las compras que hagas en
        él. Al crear una cuenta, hacer un pedido o suscribirte, los aceptás. Si no estás de acuerdo, por favor no uses el
        sitio.
      </p>

      <h2>1. Quién vende</h2>
      <ul>
        <li>Titular: {dato(NEGOCIO.titular)}</li>
        <li>CUIT: {dato(NEGOCIO.cuit)}</li>
        <li>
          Domicilio: {dato(NEGOCIO.domicilio)}, {NEGOCIO.localidad}
        </li>
        <li>Email: {dato(NEGOCIO.email)}</li>
        <li>Teléfono: {dato(NEGOCIO.telefono)}</li>
      </ul>

      <h2>2. Quién puede comprar</h2>
      <p>
        Para crear una cuenta y comprar tenés que ser mayor de 18 años. Sos responsable de mantener tu contraseña en
        secreto y de lo que se haga con tu cuenta. Si creés que alguien más la está usando, avisanos.
      </p>

      <h2>3. Productos, precios e imágenes</h2>
      <ul>
        <li>Los precios están expresados en pesos argentinos y son precios finales.</li>
        <li>
          El costo de envío depende de la zona de reparto y se muestra antes de que confirmes el pedido. El total que ves
          al confirmar es el que vas a pagar.
        </li>
        <li>
          Las imágenes de las cajas y productos son ilustrativas: el envase, los colores o la presentación pueden variar.
        </li>
        <li>
          Los productos están sujetos a disponibilidad de stock. Si después de confirmar un pedido algún producto se
          agota, te avisamos para que elijas reemplazarlo o te devolvemos lo que corresponda.
        </li>
        <li>
          Si la persona que va a recibir el regalo tiene alergias o restricciones alimentarias, revisá los productos
          antes de confirmar y consultanos ante cualquier duda sobre ingredientes.
        </li>
      </ul>

      <h2>4. Cómo se hace un pedido</h2>
      <p>
        Elegís una caja, una temática y los productos que quieras, cargás la dirección de entrega y el medio de pago, y
        confirmás. Al confirmar, el pedido queda registrado en tu cuenta (sección &quot;Mis pedidos&quot;) y nos
        comunicamos con vos para coordinar la entrega.
      </p>

      <h2>5. Pagos</h2>
      <p>
        Aceptamos transferencia bancaria o efectivo al momento de la entrega. En el sitio no se cargan datos de tarjetas
        ni cuentas bancarias. Si pagás por transferencia, podés adjuntar el comprobante al hacer el pedido o mandarlo
        después.
      </p>

      <h2>6. Entregas</h2>
      <p>
        Por ahora entregamos a domicilio dentro de {NEGOCIO.localidad.split(",")[0]}. La fecha y la franja horaria se
        coordinan con vos después de confirmar el pedido. Si no podemos entregar en lo acordado, nos comunicamos para
        reprogramar.
      </p>

      <h2>7. Suscripciones</h2>
      <ul>
        <li>
          Con una suscripción recibís una caja cada cierto tiempo (la frecuencia que elijas). El precio por entrega es el
          que se muestra al suscribirte y queda fijo para tu suscripción.
        </li>
        <li>
          Podés pausar, reactivar o cancelar tu suscripción cuando quieras y sin costo desde &quot;Mis
          suscripciones&quot;, por el mismo medio en que te suscribiste.
        </li>
        <li>
          En cada entrega te llega una temática al azar entre las que elegiste, sin repetir hasta que hayan salido
          todas.
        </li>
      </ul>

      <h2>8. Cambios, devoluciones y derecho de arrepentimiento</h2>
      <p>
        Tenés derecho a arrepentirte de la compra dentro de los 10 días corridos, en los términos de la Ley 24.240 y del
        Código Civil y Comercial. El detalle, y los casos en que no aplica, están en la{" "}
        <Link href="/cambios-y-devoluciones">Política de cambios y devoluciones</Link>. Podés pedirlo sin registrarte
        desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        La marca, los textos, el diseño y las imágenes del sitio pertenecen a {NEGOCIO.nombreComercial} o se usan con
        autorización. No se pueden copiar ni usar con fines comerciales sin permiso.
      </p>

      <h2>10. Datos personales</h2>
      <p>
        Cómo usamos y protegemos tus datos está explicado en la <Link href="/privacidad">Política de privacidad</Link>,
        y qué cookies usamos, en la <Link href="/cookies">Política de cookies</Link>.
      </p>

      <h2>11. Cambios en estos términos</h2>
      <p>
        Podemos actualizar estos términos. Los cambios no afectan los pedidos ya confirmados. Si un cambio afecta una
        suscripción activa, te lo vamos a avisar antes de que se aplique y vas a poder cancelarla sin costo.
      </p>

      <h2>12. Ley aplicable y reclamos</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina, en particular la Ley 24.240 de Defensa del
        Consumidor. Si tenés un problema, escribinos primero a {dato(NEGOCIO.email)} y lo resolvemos. También podés
        hacer un reclamo ante{" "}
        <a href={LINK_DEFENSA_CONSUMIDOR} target="_blank" rel="noopener noreferrer">
          Defensa de las y los Consumidores
        </a>
        . Son competentes los tribunales correspondientes a tu domicilio.
      </p>
    </PaginaLegal>
  );
}
