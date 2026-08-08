import type { Metadata } from "next";
import Link from "next/link";
import { Documento, TablaScroll } from "@/components/legal/documento";
import { SUBENCARGADOS, TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad | Cremmo",
  description:
    "Cómo tratamos los datos personales en Cremmo: finalidades, base jurídica, conservación, destinatarios y derechos.",
};

export default function PrivacidadPage() {
  return (
    <Documento
      titulo="Política de privacidad"
      descripcion="Información sobre el tratamiento de datos personales conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD)."
    >
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Responsable:</strong> {TITULAR.nombre}
        </li>
        <li>
          <strong>NIF:</strong> {TITULAR.nif}
        </li>
        <li>
          <strong>Domicilio:</strong> {TITULAR.direccion}
        </li>
        <li>
          <strong>Contacto y ejercicio de derechos:</strong>{" "}
          <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>
        </li>
      </ul>
      <p>
        No se ha designado delegado de protección de datos por no concurrir
        ninguno de los supuestos del artículo 37 del RGPD.
      </p>

      <h2>2. Dos papeles distintos, según de quién sean los datos</h2>
      <p>
        Conviene distinguir dos situaciones, porque las obligaciones son
        diferentes:
      </p>
      <ul>
        <li>
          <strong>Datos de los negocios clientes.</strong> Cuando una heladería
          se registra y contrata {TITULAR.marca}, tratamos los datos de su
          persona de contacto como <strong>responsables</strong>. Esta política
          describe ese tratamiento.
        </li>
        <li>
          <strong>Datos contenidos en los pedidos.</strong> Los datos que se
          generan en la carta pública de cada establecimiento pertenecen a ese
          establecimiento, que actúa como responsable. Nosotros los tratamos
          únicamente como <strong>encargados del tratamiento</strong> por su
          cuenta y siguiendo sus instrucciones, en los términos del{" "}
          <Link href="/encargado-tratamiento">
            contrato de encargado del tratamiento
          </Link>
          . Si eres cliente final de una heladería y quieres ejercer tus
          derechos, dirígete al establecimiento en el que hiciste el pedido.
        </li>
      </ul>

      <h2>3. Datos que tratamos y con qué finalidad</h2>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Tratamiento</th>
              <th>Datos</th>
              <th>Finalidad</th>
              <th>Base jurídica</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cuenta de usuario</td>
              <td>
                Nombre, correo electrónico y contraseña (almacenada cifrada por
                nuestro proveedor de autenticación)
              </td>
              <td>Crear y mantener la cuenta y dar acceso al panel</td>
              <td>Ejecución del contrato (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td>Datos del negocio</td>
              <td>
                Nombre comercial, eslogan, teléfono, logotipo e imágenes del
                catálogo
              </td>
              <td>Publicar la carta digital y prestar el servicio</td>
              <td>Ejecución del contrato (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td>Suscripción y facturación</td>
              <td>
                Plan contratado, fechas de alta y baja, datos de facturación y
                de pago tratados por la pasarela
              </td>
              <td>Gestionar la suscripción, cobrar y emitir facturas</td>
              <td>
                Ejecución del contrato y obligación legal contable y fiscal
                (arts. 6.1.b y 6.1.c RGPD)
              </td>
            </tr>
            <tr>
              <td>Soporte y comunicaciones</td>
              <td>Datos de contacto y contenido de los mensajes</td>
              <td>Atender consultas e incidencias del servicio</td>
              <td>Ejecución del contrato (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td>Seguridad</td>
              <td>
                Registros técnicos de acceso generados por los proveedores de
                alojamiento
              </td>
              <td>
                Garantizar la seguridad del servicio y detectar usos indebidos
              </td>
              <td>Interés legítimo (art. 6.1.f RGPD)</td>
            </tr>
          </tbody>
        </table>
      </TablaScroll>
      <p>
        No se realizan decisiones automatizadas con efectos jurídicos ni
        elaboración de perfiles. No enviamos comunicaciones comerciales
        distintas de las relativas al propio servicio contratado.
      </p>

      <h2>4. Datos de los pedidos</h2>
      <p>
        La aplicación está diseñada para pedir el mínimo de información posible
        al cliente final: un pedido guarda los productos elegidos, el importe, la
        mesa desde la que se pide y, opcionalmente, unas notas de texto libre. No
        se solicitan nombre, teléfono, dirección ni datos de contacto.
      </p>
      <p>
        <strong>Advertencia sobre el campo de notas.</strong> Al ser texto libre,
        un cliente puede escribir información personal e incluso datos de salud
        (por ejemplo, una alergia alimentaria). Recomendamos a los
        establecimientos no solicitar por esa vía más información de la
        imprescindible y borrar los pedidos antiguos con regularidad. Estos datos
        se tratan por cuenta del establecimiento, que es su responsable.
      </p>

      <h2>5. Destinatarios y encargados</h2>
      <p>
        No cedemos datos personales a terceros salvo obligación legal. Para
        prestar el servicio nos apoyamos en los siguientes proveedores, que
        actúan como encargados del tratamiento con contrato firmado conforme al
        artículo 28 del RGPD:
      </p>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Finalidad</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {SUBENCARGADOS.map((s) => (
              <tr key={s.nombre}>
                <td>{s.nombre}</td>
                <td>{s.finalidad}</td>
                <td>{s.ubicacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablaScroll>

      <h2>6. Transferencias internacionales</h2>
      <p>
        La base de datos, la autenticación y los archivos se alojan en servidores
        situados en Irlanda, dentro de la Unión Europea. El alojamiento de la
        aplicación se presta por Vercel, Inc., entidad estadounidense adherida al
        Data Privacy Framework UE-EE. UU. y con cláusulas contractuales tipo, lo
        que constituye una transferencia internacional con garantías adecuadas
        conforme al capítulo V del RGPD.
      </p>

      <h2>7. Plazos de conservación</h2>
      <ul>
        <li>
          <strong>Datos de la cuenta y del negocio:</strong> mientras la cuenta
          esté activa. Tras la baja se conservan bloqueados durante el plazo de
          prescripción de las acciones derivadas del contrato y después se
          suprimen.
        </li>
        <li>
          <strong>Facturación:</strong> seis años, conforme al artículo 30 del
          Código de Comercio, y cuatro años a efectos fiscales según la Ley
          General Tributaria.
        </li>
        <li>
          <strong>Pedidos:</strong> mientras el establecimiento mantenga su
          cuenta o hasta que decida eliminarlos, al ser él el responsable.
        </li>
      </ul>

      <h2>8. Derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión,
        oposición, limitación del tratamiento y portabilidad, así como retirar el
        consentimiento cuando el tratamiento se base en él, escribiendo a{" "}
        <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a> e indicando el
        derecho que ejercitas. Podemos pedirte que acredites tu identidad.
      </p>
      <p>
        Si consideras que no hemos atendido correctamente tu solicitud, puedes
        presentar una reclamación ante la Agencia Española de Protección de
        Datos, en{" "}
        <a
          href="https://www.aepd.es"
          target="_blank"
          rel="noopener noreferrer"
        >
          www.aepd.es
        </a>
        .
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas apropiadas: cifrado en
        tránsito mediante HTTPS, contraseñas almacenadas con funciones de
        derivación de clave, aislamiento estricto entre los datos de cada negocio
        mediante políticas de seguridad a nivel de fila en la base de datos,
        control de acceso por roles y copias de seguridad gestionadas por el
        proveedor de base de datos.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Podemos actualizar esta política para adaptarla a cambios normativos o
        del servicio. Si el cambio es sustancial, avisaremos a los clientes por
        correo electrónico o desde el propio panel.
      </p>
    </Documento>
  );
}
