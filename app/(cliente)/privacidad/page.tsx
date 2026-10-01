import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/PaginaLegal";
import { LINK_AAIP, NEGOCIO, dato } from "@/lib/negocio";

export const metadata: Metadata = { title: "Política de privacidad — Memento" };

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p>
        En {NEGOCIO.nombreComercial} pedimos solo los datos necesarios para venderte y entregarte tu caja. Esta política
        explica qué datos guardamos, para qué, dónde y qué derechos tenés, según la Ley 25.326 de Protección de Datos
        Personales.
      </p>

      <h2>1. Responsable de tus datos</h2>
      <ul>
        <li>Titular: {dato(NEGOCIO.titular)}</li>
        <li>CUIT: {dato(NEGOCIO.cuit)}</li>
        <li>
          Domicilio: {dato(NEGOCIO.domicilio)}, {NEGOCIO.localidad}
        </li>
        <li>Contacto para temas de datos personales: {dato(NEGOCIO.email)}</li>
      </ul>

      <h2>2. Qué datos guardamos</h2>
      <ul>
        <li>
          <strong>Para tu cuenta:</strong> nombre, email y contraseña. La contraseña se guarda cifrada: nadie de{" "}
          {NEGOCIO.nombreComercial} puede verla.
        </li>
        <li>
          <strong>Para tus pedidos y suscripciones:</strong> dirección de entrega, teléfono de contacto (solo para
          coordinar la entrega), zona de reparto, medio de pago elegido, productos y temáticas, y el comprobante de
          transferencia si decidís adjuntarlo.
        </li>
        <li>
          <strong>Si usás el Botón de arrepentimiento:</strong> nombre, email, número de pedido y el detalle que
          escribas.
        </li>
      </ul>
      <p>
        No pedimos DNI, datos de tarjetas ni datos bancarios. Tampoco recolectamos datos sensibles.
      </p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Crear y mantener tu cuenta.</li>
        <li>Preparar, cobrar y entregar tus pedidos, y gestionar tus suscripciones.</li>
        <li>Comunicarnos con vos sobre tus pedidos, entregas y solicitudes.</li>
        <li>Cumplir obligaciones legales, fiscales y de defensa del consumidor.</li>
      </ul>
      <p>
        No usamos tus datos para publicidad, no los vendemos y no los compartimos con nadie para fines comerciales.
      </p>

      <h2>4. Con quién los compartimos y dónde se guardan</h2>
      <p>Para que el sitio funcione usamos estos proveedores, que tratan los datos solo para prestarnos su servicio:</p>
      <ul>
        <li>
          <strong>Supabase:</strong> base de datos, inicio de sesión y almacenamiento de archivos (fotos del catálogo y
          comprobantes). También envía los emails de confirmación de cuenta.
        </li>
        <li>
          <strong>Vercel:</strong> alojamiento del sitio web.
        </li>
      </ul>
      <p>
        Los servidores de estos proveedores pueden estar ubicados fuera de la Argentina, en países que podrían no tener
        un nivel de protección de datos equivalente. Al aceptar esta política prestás tu consentimiento expreso para esa
        transferencia internacional, conforme al artículo 12 de la Ley 25.326 y su decreto reglamentario.
      </p>
      <p>
        Si el reparto lo hace otra persona, le pasamos solo el nombre, el teléfono y la dirección de entrega. Fuera de eso, solo
        compartiríamos tus datos con una autoridad si una ley o una orden judicial lo exige.
      </p>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Los datos de tu cuenta, mientras la tengas activa. Los de pedidos y pagos, durante el tiempo que exijan las
        normas fiscales y comerciales. Pasado ese plazo los eliminamos.
      </p>

      <h2>6. Cómo los protegemos</h2>
      <ul>
        <li>El sitio funciona siempre por conexión cifrada (HTTPS).</li>
        <li>
          Cada cliente solo puede ver sus propios pedidos y suscripciones; el panel de administración está restringido.
        </li>
        <li>Los comprobantes de transferencia se guardan en un almacenamiento privado.</li>
      </ul>

      <h2>7. Tus derechos</h2>
      <p>
        Podés pedirnos <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>,{" "}
        <strong>actualizarlos</strong> o <strong>suprimirlos</strong>, y retirar tu consentimiento, escribiendo a{" "}
        {dato(NEGOCIO.email)}. Respondemos los pedidos de acceso dentro de los 10 días corridos y los de rectificación o
        supresión dentro de los 5 días hábiles, como indica la ley. La supresión no procede cuando tenemos la obligación
        legal de conservar el dato (por ejemplo, registros de una venta).
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
        establecido en el artículo 14, inciso 3 de la Ley N° 25.326.
      </p>
      <p>
        La{" "}
        <a href={LINK_AAIP} target="_blank" rel="noopener noreferrer">
          Agencia de Acceso a la Información Pública
        </a>
        , en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y
        reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en
        materia de protección de datos personales.
      </p>

      <h2>8. Menores de edad</h2>
      <p>El sitio está pensado para mayores de 18 años. No recolectamos a sabiendas datos de menores.</p>

      <h2>9. Cookies</h2>
      <p>
        Solo usamos las cookies necesarias para mantener tu sesión iniciada. Más detalle en la{" "}
        <Link href="/cookies">Política de cookies</Link>.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Si cambiamos esta política, publicamos la nueva versión acá con su fecha. Si el cambio es importante, te lo
        avisamos por email.
      </p>
    </PaginaLegal>
  );
}
