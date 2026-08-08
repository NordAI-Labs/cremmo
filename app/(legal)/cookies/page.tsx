import type { Metadata } from "next";
import { Documento, TablaScroll } from "@/components/legal/documento";
import { TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de cookies | Cremmo",
  description:
    "Qué cookies y almacenamiento local utiliza Cremmo. Solo empleamos cookies técnicas necesarias, sin publicidad ni analítica.",
};

export default function CookiesPage() {
  return (
    <Documento
      titulo="Política de cookies"
      descripcion="Información sobre el uso de cookies y almacenamiento local, conforme al artículo 22.2 de la Ley 34/2002 (LSSI-CE)."
    >
      <h2>1. Resumen</h2>
      <p>
        <strong>
          {TITULAR.marca} no utiliza cookies de publicidad, de analítica ni de
          redes sociales, ni comparte información con terceros con fines
          publicitarios.
        </strong>{" "}
        Solo empleamos cookies técnicas estrictamente necesarias para que el
        servicio funcione y almacenamiento local en el navegador para recordar el
        carrito de la compra. Por ese motivo, y conforme al artículo 22.2 de la
        LSSI-CE, no es necesario solicitar tu consentimiento previo ni mostrar un
        banner de cookies.
      </p>

      <h2>2. Qué es una cookie</h2>
      <p>
        Una cookie es un pequeño archivo que un sitio web guarda en tu navegador
        para recordar información entre páginas o entre visitas. Junto a las
        cookies existen otras tecnologías de almacenamiento del navegador, como
        el <em>localStorage</em>, con una función parecida. Ambas se detallan a
        continuación.
      </p>

      <h2>3. Cookies utilizadas</h2>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Titular</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>sb-&lt;referencia&gt;-auth-token</code>
              </td>
              <td>Propia (gestionada por Supabase)</td>
              <td>
                Mantener iniciada la sesión del personal en el panel de gestión y
                renovarla de forma segura. Sin ella habría que volver a iniciar
                sesión en cada página.
              </td>
              <td>Hasta el cierre de sesión o su caducidad</td>
            </tr>
          </tbody>
        </table>
      </TablaScroll>
      <p>
        Todas ellas son <strong>cookies técnicas propias</strong>, exentas del
        deber de consentimiento. La carta pública, la que ve el cliente final al
        escanear el código QR, no instala ninguna cookie.
      </p>

      <h2>4. Almacenamiento local</h2>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Tipo</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>heladeria-cart</code>
              </td>
              <td>localStorage</td>
              <td>
                Recordar los productos que has añadido al carrito para que no se
                pierdan al recargar la página. Se guarda solo en tu dispositivo y
                no se envía a ningún tercero.
              </td>
              <td>Hasta que se envía el pedido o se borran los datos del navegador</td>
            </tr>
            <tr>
              <td>
                <code>ultimo-pedido</code>
              </td>
              <td>sessionStorage</td>
              <td>
                Mostrar el resumen del pedido en la pantalla de confirmación.
              </td>
              <td>Hasta cerrar la pestaña</td>
            </tr>
          </tbody>
        </table>
      </TablaScroll>

      <h2>5. Cómo gestionarlas o eliminarlas</h2>
      <p>
        Puedes bloquear o borrar las cookies y el almacenamiento local desde la
        configuración de tu navegador. Ten en cuenta que, al tratarse de
        elementos técnicos necesarios, bloquearlos impedirá iniciar sesión en el
        panel o mantener el carrito entre páginas.
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/es/kb/Borrar%20cookies"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>6. Cambios</h2>
      <p>
        Si en el futuro incorporamos cookies de analítica o de terceros,
        actualizaremos esta política e implantaremos un sistema de consentimiento
        previo antes de instalarlas. Para cualquier duda puedes escribirnos a{" "}
        <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>.
      </p>
    </Documento>
  );
}
