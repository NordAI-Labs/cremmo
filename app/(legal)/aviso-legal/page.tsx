import type { Metadata } from "next";
import Link from "next/link";
import { Documento } from "@/components/legal/documento";
import { TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Aviso legal | Cremmo",
  description:
    "Información legal del titular del sitio web y condiciones de uso, conforme a la Ley 34/2002 (LSSI-CE).",
};

export default function AvisoLegalPage() {
  return (
    <Documento
      titulo="Aviso legal"
      descripcion="Información exigida por la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE)."
    >
      <h2>1. Titular del sitio web</h2>
      <p>
        En cumplimiento del artículo 10 de la LSSI-CE, se informa de que el
        titular de este sitio web es:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> {TITULAR.nombre}
        </li>
        <li>
          <strong>NIF:</strong> {TITULAR.nif}
        </li>
        <li>
          <strong>Domicilio:</strong> {TITULAR.direccion}
        </li>
        <li>
          <strong>Correo electrónico:</strong>{" "}
          <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>
        </li>
        <li>
          <strong>Teléfono:</strong> {TITULAR.telefono}
        </li>
        <li>
          <strong>Sitio web:</strong> {TITULAR.dominio}
        </li>
        <li>
          <strong>Nombre comercial:</strong> {TITULAR.marca}
        </li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        {TITULAR.marca} es una plataforma en modo <em>software como servicio</em>{" "}
        que permite a heladerías y otros negocios de hostelería publicar su carta
        digital, recibir pedidos desde los dispositivos de sus clientes mediante
        códigos QR y gestionar sus comandas, promociones y estadísticas.
      </p>
      <p>
        El presente aviso legal regula el acceso y la navegación por el sitio
        web. La contratación del servicio se rige además por los{" "}
        <Link href="/terminos">términos y condiciones</Link>, y el tratamiento de
        datos personales por la{" "}
        <Link href="/privacidad">política de privacidad</Link>.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El acceso al sitio web es gratuito, salvo el coste de la conexión a
        internet del usuario. El usuario se compromete a hacer un uso lícito del
        sitio y a no emplearlo para actividades contrarias a la ley, a la moral o
        al orden público, ni para introducir virus o cualquier otro código que
        pueda dañar los sistemas del titular o de terceros.
      </p>
      <p>
        El usuario es responsable de la veracidad de los datos que facilite y de
        la custodia de sus credenciales de acceso al panel de gestión.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        El código fuente, el diseño, la estructura de navegación, las bases de
        datos, los textos, las marcas y los logotipos del sitio son titularidad
        de {TITULAR.nombre} o cuenta con licencia para su uso. Queda prohibida su
        reproducción, distribución, comunicación pública o transformación sin
        autorización expresa y por escrito.
      </p>
      <p>
        Los contenidos que cada negocio cliente publique en su carta (nombres de
        producto, descripciones, imágenes y logotipos) siguen siendo de su
        titularidad. Ese negocio garantiza disponer de los derechos necesarios y
        responde frente a reclamaciones de terceros por los contenidos que suba.
      </p>

      <h2>5. Responsabilidad</h2>
      <p>
        El titular no garantiza la disponibilidad ininterrumpida del sitio y no
        responde de los daños derivados de fallos o interrupciones ajenos a su
        control, ni de la información publicada por los negocios clientes en sus
        cartas, incluidos precios, composición de los productos, alérgenos y
        disponibilidad. El responsable de esa información es en todo caso el
        negocio que la publica.
      </p>
      <p>
        Los pedidos realizados a través de la plataforma se formalizan entre el
        cliente final y el establecimiento correspondiente. {TITULAR.marca}{" "}
        actúa únicamente como proveedor de la herramienta tecnológica y no es
        parte de esa relación ni de la preparación o entrega del pedido.
      </p>

      <h2>6. Enlaces</h2>
      <p>
        El sitio puede incluir enlaces a páginas de terceros. El titular no
        controla sus contenidos ni asume responsabilidad alguna sobre ellos.
      </p>

      <h2>7. Legislación aplicable y jurisdicción</h2>
      <p>
        Este aviso legal se rige por la legislación española. Para la resolución
        de cualquier controversia, y salvo que la normativa aplicable imponga
        otro fuero, las partes se someten a los Juzgados y Tribunales de{" "}
        {TITULAR.fuero}, con renuncia expresa a cualquier otro que pudiera
        corresponderles.
      </p>
    </Documento>
  );
}
