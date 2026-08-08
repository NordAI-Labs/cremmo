import type { Metadata } from "next";
import Link from "next/link";
import { Documento, TablaScroll } from "@/components/legal/documento";
import { TITULAR } from "@/lib/legal";
import { PLANES, formatPrecioPlan } from "@/lib/planes";

export const metadata: Metadata = {
  title: "Términos y condiciones | Cremmo",
  description:
    "Condiciones de contratación y uso del servicio Cremmo: planes, precios, facturación, cancelación y responsabilidades.",
};

export default function TerminosPage() {
  return (
    <Documento
      titulo="Términos y condiciones del servicio"
      descripcion="Condiciones que rigen la contratación y el uso de Cremmo. Al crear una cuenta declaras haberlas leído y aceptarlas."
    >
      <h2>1. Partes</h2>
      <p>
        De una parte, {TITULAR.nombre}, con NIF {TITULAR.nif} y domicilio en{" "}
        {TITULAR.direccion} (en adelante, el <strong>Proveedor</strong>), titular
        de la plataforma {TITULAR.marca}. De otra, la persona física o jurídica
        que contrata el servicio (en adelante, el <strong>Cliente</strong>).
      </p>
      <p>
        {TITULAR.marca} es un servicio dirigido <strong>a profesionales</strong>{" "}
        en el ejercicio de su actividad empresarial. No se presta a
        consumidores, por lo que no resulta de aplicación el derecho de
        desistimiento previsto para estos en el texto refundido de la Ley General
        para la Defensa de los Consumidores y Usuarios.
      </p>

      <h2>2. Objeto</h2>
      <p>
        El Proveedor concede al Cliente un derecho de uso no exclusivo,
        intransferible y limitado a la duración de la suscripción sobre la
        plataforma {TITULAR.marca}, que permite publicar una carta digital,
        recibir pedidos mediante códigos QR y gestionar comandas, promociones,
        mesas y estadísticas. El servicio se presta en modalidad{" "}
        <em>software como servicio</em>: no se entrega ni se licencia el código
        fuente.
      </p>

      <h2>3. Cuenta y credenciales</h2>
      <p>
        Para usar el servicio hay que crear una cuenta con datos veraces y
        actualizados. El Cliente es responsable de la confidencialidad de sus
        credenciales y de toda actividad realizada desde su cuenta, y debe
        comunicar sin demora cualquier acceso no autorizado. El Cliente puede dar
        acceso a su personal, respondiendo del uso que estos hagan.
      </p>

      <h2>4. Planes y precios</h2>
      <TablaScroll>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Precio mensual (sin IVA)</th>
              <th>Incluye</th>
            </tr>
          </thead>
          <tbody>
            {PLANES.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.nombre}
                  {!p.disponible && " (próximamente disponible)"}
                </td>
                <td>{formatPrecioPlan(p.precio)}</td>
                <td>{p.caracteristicas.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablaScroll>
      <p>
        Los precios se expresan <strong>sin IVA</strong>; se aplicará el tipo
        impositivo vigente en cada momento. Los planes marcados como próximamente
        disponibles no son contratables hasta que se anuncie su lanzamiento.
      </p>
      <p>
        El Proveedor puede modificar los precios comunicándolo al Cliente con al
        menos treinta días de antelación. Si el Cliente no acepta el nuevo
        precio, puede cancelar la suscripción antes de que surta efecto, sin
        penalización.
      </p>

      <h2>5. Facturación y forma de pago</h2>
      <p>
        La suscripción se factura <strong>por meses anticipados</strong> y se
        cobra mediante tarjeta a través de la pasarela de pago Stripe Payments
        Europe, Ltd. El Proveedor no almacena los datos completos de la tarjeta,
        que son tratados directamente por la pasarela.
      </p>
      <p>
        El ciclo de facturación queda anclado al día de alta: si la cuenta se
        crea un día 15, la renovación se produce el día 15 de cada mes. En los
        meses que no tengan ese día, el cargo se realiza el último día del mes.
        La suscripción se <strong>renueva automáticamente</strong> por periodos
        mensuales mientras no se cancele.
      </p>
      <p>
        En caso de impago, el Proveedor podrá reintentar el cobro y, si persiste,
        suspender el acceso al servicio y la publicación de la carta pública
        previo aviso al Cliente. La suspensión no exime del pago de las
        cantidades devengadas.
      </p>

      <h2>6. Cambio de plan y cancelación</h2>
      <p>
        El Cliente puede cambiar de plan o cancelar en cualquier momento desde el
        apartado de ajustes de su panel, sin necesidad de preaviso ni de
        justificación y sin penalización.
      </p>
      <p>
        La cancelación <strong>no es inmediata</strong>: el servicio permanece
        activo hasta el final del periodo mensual ya abonado, calculado según el
        ciclo descrito en la cláusula anterior, y a partir de esa fecha la carta
        pública deja de estar accesible y no se pueden recibir pedidos. El
        Cliente puede reanudar la suscripción antes de esa fecha sin coste
        adicional. <strong>No se realizan reembolsos parciales</strong> de
        periodos ya iniciados.
      </p>
      <p>
        Tras la baja, los datos se conservan durante un plazo razonable para
        permitir la reactivación y después se suprimen conforme a la{" "}
        <Link href="/privacidad">política de privacidad</Link>. El Cliente puede
        solicitar una copia de sus datos antes de la supresión.
      </p>

      <h2>7. Obligaciones del Cliente</h2>
      <ul>
        <li>
          Mantener actualizada y veraz la información de su carta, en especial
          los <strong>precios, la composición de los productos y la información
          sobre alérgenos</strong>, cuyo cumplimiento normativo le corresponde en
          exclusiva.
        </li>
        <li>
          Disponer de los derechos sobre los contenidos, imágenes y marcas que
          publique, y responder frente a reclamaciones de terceros.
        </li>
        <li>
          Cumplir sus propias obligaciones frente a sus clientes finales y en
          materia fiscal, sanitaria, de consumo y de protección de datos.
        </li>
        <li>
          No emplear el servicio para fines ilícitos, ni intentar acceder a
          datos de otros clientes, ni realizar ingeniería inversa, ni someter la
          plataforma a cargas que comprometan su estabilidad.
        </li>
      </ul>

      <h2>8. Disponibilidad y soporte</h2>
      <p>
        El Proveedor pondrá los medios razonables para mantener el servicio
        disponible de forma continuada, sin comprometer un porcentaje concreto de
        disponibilidad. Podrán realizarse paradas de mantenimiento, que se
        procurará programar en horarios de bajo uso. El soporte se presta por
        correo electrónico en{" "}
        <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>, en horario
        laborable.
      </p>

      <h2>9. Responsabilidad</h2>
      <p>
        Los pedidos se formalizan entre el Cliente y sus propios clientes
        finales. El Proveedor no es parte de esa relación ni responde de la
        preparación, la calidad, el cobro o la entrega de los productos.
      </p>
      <p>
        En la medida permitida por la ley, la responsabilidad total del Proveedor
        frente al Cliente por cualquier concepto se limita al importe de las
        cuotas efectivamente abonadas por el Cliente en los doce meses anteriores
        al hecho que motive la reclamación. No se responde del lucro cesante ni
        de daños indirectos. Esta limitación no se aplica en casos de dolo o
        culpa grave, ni a las responsabilidades que la ley declare
        indisponibles.
      </p>

      <h2>10. Propiedad intelectual</h2>
      <p>
        La plataforma, su código y sus elementos gráficos son titularidad del
        Proveedor. Los contenidos y datos que el Cliente introduce siguen siendo
        suyos; el Cliente autoriza al Proveedor a alojarlos y mostrarlos en la
        medida necesaria para prestar el servicio.
      </p>

      <h2>11. Protección de datos</h2>
      <p>
        El tratamiento de los datos de la persona de contacto del Cliente se rige
        por la <Link href="/privacidad">política de privacidad</Link>. Respecto
        de los datos que el Cliente gestiona a través de la plataforma, el
        Proveedor actúa como encargado del tratamiento en los términos del{" "}
        <Link href="/encargado-tratamiento">
          contrato de encargado del tratamiento
        </Link>
        , que forma parte inseparable de estas condiciones.
      </p>

      <h2>12. Duración, modificación y resolución</h2>
      <p>
        El contrato se perfecciona con el alta y permanece vigente por periodos
        mensuales renovables. El Proveedor podrá modificar estas condiciones
        avisando con treinta días de antelación; el uso del servicio tras esa
        fecha implica su aceptación. Cualquiera de las partes puede resolver el
        contrato por incumplimiento grave de la otra si no se subsana en quince
        días desde el requerimiento.
      </p>

      <h2>13. Legislación aplicable y jurisdicción</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Las partes se
        someten expresamente a los Juzgados y Tribunales de {TITULAR.fuero} para
        la resolución de cualquier controversia, con renuncia a cualquier otro
        fuero.
      </p>
    </Documento>
  );
}
