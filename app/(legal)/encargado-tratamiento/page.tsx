import type { Metadata } from "next";
import { Documento, TablaScroll } from "@/components/legal/documento";
import { SUBENCARGADOS, TITULAR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contrato de encargado del tratamiento | Cremmo",
  description:
    "Condiciones del artículo 28 del RGPD que regulan el tratamiento de datos personales que Cremmo realiza por cuenta de cada negocio cliente.",
};

export default function EncargadoTratamientoPage() {
  return (
    <Documento
      titulo="Contrato de encargado del tratamiento"
      descripcion="Acuerdo exigido por el artículo 28 del RGPD, que regula el tratamiento de datos personales que el Proveedor realiza por cuenta del Cliente. Forma parte inseparable de los términos y condiciones y se acepta al crear la cuenta."
    >
      <h2>1. Partes y objeto</h2>
      <p>
        Este acuerdo se celebra entre el negocio que contrata {TITULAR.marca}, en
        calidad de <strong>Responsable del tratamiento</strong> (el Cliente), y{" "}
        {TITULAR.nombre}, con NIF {TITULAR.nif} y domicilio en{" "}
        {TITULAR.direccion}, en calidad de{" "}
        <strong>Encargado del tratamiento</strong> (el Proveedor).
      </p>
      <p>
        Su objeto es regular el tratamiento de los datos personales a los que el
        Proveedor accede como consecuencia de la prestación del servicio. El
        Cliente determina las finalidades y los medios de ese tratamiento; el
        Proveedor se limita a tratar los datos siguiendo sus instrucciones.
      </p>

      <h2>2. Descripción del tratamiento</h2>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Objeto</td>
              <td>
                Alojamiento y procesamiento de los datos generados en la carta
                digital y en la gestión de pedidos del Cliente
              </td>
            </tr>
            <tr>
              <td>Naturaleza y finalidad</td>
              <td>
                Recogida, registro, conservación, consulta, modificación y
                supresión de datos, con la única finalidad de prestar el servicio
                contratado
              </td>
            </tr>
            <tr>
              <td>Duración</td>
              <td>
                Mientras esté vigente la suscripción, más el plazo de devolución
                o supresión previsto en la cláusula 8
              </td>
            </tr>
            <tr>
              <td>Categorías de interesados</td>
              <td>
                Personal del Cliente con acceso al panel y clientes finales que
                realizan pedidos
              </td>
            </tr>
            <tr>
              <td>Categorías de datos</td>
              <td>
                Datos identificativos y de contacto del personal (nombre y correo
                electrónico); datos de pedidos (productos, importes, mesa, fecha
                y notas de texto libre)
              </td>
            </tr>
            <tr>
              <td>Categorías especiales</td>
              <td>
                No se solicitan. No obstante, el campo de notas del pedido es
                texto libre y puede contener datos de salud si un cliente final
                menciona una alergia o intolerancia (véase la cláusula 3)
              </td>
            </tr>
          </tbody>
        </table>
      </TablaScroll>

      <h2>3. Advertencia sobre el campo de notas</h2>
      <p>
        La plataforma está diseñada para minimizar la recogida de datos: no pide
        nombre, teléfono, dirección ni ningún dato de contacto del cliente final.
        Sin embargo, el campo de notas del pedido admite texto libre y un cliente
        puede escribir en él datos personales o de salud, como una alergia
        alimentaria, que constituyen una categoría especial de datos del artículo
        9 del RGPD.
      </p>
      <p>
        El Cliente, como responsable, se compromete a no fomentar la
        introducción de datos innecesarios por esa vía, a tratar esa información
        exclusivamente para preparar el pedido y a eliminar los pedidos antiguos
        con regularidad. El Proveedor no accede a ese contenido salvo para
        resolver una incidencia técnica a petición del Cliente.
      </p>

      <h2>4. Obligaciones del Proveedor como encargado</h2>
      <p>El Proveedor se obliga a:</p>
      <ul>
        <li>
          Tratar los datos <strong>únicamente siguiendo instrucciones
          documentadas</strong> del Cliente, incluidas las relativas a
          transferencias internacionales. La contratación y el uso normal del
          servicio constituyen esas instrucciones.
        </li>
        <li>
          No utilizar los datos para fines propios ni cederlos a terceros, salvo
          obligación legal, en cuyo caso informará previamente al Cliente si la
          ley lo permite.
        </li>
        <li>
          Garantizar que las personas autorizadas para tratar los datos se han
          comprometido a respetar la <strong>confidencialidad</strong>, con
          carácter indefinido incluso tras finalizar la relación.
        </li>
        <li>
          Aplicar las <strong>medidas de seguridad</strong> del artículo 32 del
          RGPD descritas en la cláusula 5.
        </li>
        <li>
          <strong>Asistir al Cliente</strong> en la atención de los derechos de
          los interesados. Si el Proveedor recibe una solicitud directamente de
          un interesado, la trasladará al Cliente sin dilación.
        </li>
        <li>
          Ayudar al Cliente en la realización de evaluaciones de impacto y en las
          consultas previas a la autoridad de control, cuando procedan.
        </li>
        <li>
          <strong>Notificar al Cliente sin dilación indebida</strong>, y en todo
          caso dentro de las 48 horas siguientes a tener conocimiento, cualquier
          violación de la seguridad de los datos, aportando la información
          disponible para que el Cliente pueda notificarla a la autoridad de
          control en el plazo de 72 horas.
        </li>
        <li>
          Poner a disposición del Cliente la información necesaria para
          demostrar el cumplimiento de estas obligaciones y permitir auditorías,
          en los términos de la cláusula 7.
        </li>
        <li>
          Llevar un <strong>registro de las actividades de tratamiento</strong>{" "}
          realizadas por cuenta del Cliente, conforme al artículo 30.2 del RGPD.
        </li>
      </ul>

      <h2>5. Medidas de seguridad</h2>
      <ul>
        <li>Cifrado de las comunicaciones en tránsito mediante HTTPS.</li>
        <li>
          Cifrado de los datos en reposo y copias de seguridad automáticas
          gestionadas por el proveedor de base de datos.
        </li>
        <li>
          <strong>Aislamiento entre clientes</strong> mediante políticas de
          seguridad a nivel de fila en la base de datos: cada negocio solo puede
          acceder a las filas que le pertenecen, con independencia de la vía de
          acceso.
        </li>
        <li>
          Contraseñas almacenadas mediante funciones de derivación de clave, sin
          que el Proveedor pueda conocerlas.
        </li>
        <li>Control de acceso por roles diferenciados (propietario y personal).</li>
        <li>
          Validación y recálculo en servidor de los importes de cada pedido, sin
          confiar en los datos enviados por el cliente.
        </li>
        <li>
          Registro de accesos y revisión periódica de la configuración de
          seguridad.
        </li>
      </ul>

      <h2>6. Subencargados</h2>
      <p>
        El Cliente <strong>autoriza de forma general</strong> al Proveedor a
        recurrir a los siguientes subencargados, con los que se han suscrito
        contratos que imponen las mismas obligaciones de protección de datos:
      </p>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Subencargado</th>
              <th>Servicio</th>
              <th>Ubicación y garantías</th>
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
      <p>
        El Proveedor informará al Cliente de cualquier alta o sustitución de
        subencargados con una antelación mínima de treinta días, actualizando
        esta página y avisando por correo electrónico. El Cliente podrá oponerse
        por motivos razonables y, si no se alcanza una solución, resolver la
        suscripción sin penalización.
      </p>

      <h2>7. Auditoría</h2>
      <p>
        El Cliente puede solicitar, con un preaviso de treinta días y como máximo
        una vez al año, la información necesaria para verificar el cumplimiento
        de este acuerdo, así como las certificaciones o informes de seguridad
        disponibles de los subencargados. Las auditorías presenciales o
        adicionales que el Cliente solicite se realizarán a su costa y sin
        perjudicar la prestación del servicio a otros clientes.
      </p>

      <h2>8. Devolución o supresión al finalizar</h2>
      <p>
        Finalizada la prestación, el Proveedor suprimirá los datos personales
        tratados por cuenta del Cliente, salvo que este solicite previamente su
        devolución en formato estructurado y de uso común. Los datos se conservan
        durante un plazo razonable tras la baja para permitir la reactivación de
        la cuenta y, transcurrido este, se suprimen. El Proveedor podrá conservar
        copias bloqueadas mientras exista una obligación legal de conservación o
        para atender posibles responsabilidades.
      </p>

      <h2>9. Obligaciones del Cliente como responsable</h2>
      <ul>
        <li>
          Informar a sus clientes finales y a su personal del tratamiento de sus
          datos y disponer de la base jurídica adecuada.
        </li>
        <li>
          Publicar su propia información de protección de datos cuando la
          normativa se lo exija.
        </li>
        <li>
          Realizar, en su caso, la evaluación de impacto y las consultas previas.
        </li>
        <li>
          Velar por el cumplimiento del RGPD y de la LOPDGDD en relación con los
          datos que decide tratar a través de la plataforma.
        </li>
      </ul>

      <h2>10. Responsabilidad y régimen aplicable</h2>
      <p>
        Cada parte responde de los daños causados por el incumplimiento de las
        obligaciones que le corresponden conforme al RGPD. Este acuerdo se rige
        por la legislación española y de la Unión Europea, y se somete a los
        Juzgados y Tribunales de {TITULAR.fuero}.
      </p>
      <p>
        Para cualquier cuestión relativa a este acuerdo puedes escribir a{" "}
        <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>.
      </p>
    </Documento>
  );
}
