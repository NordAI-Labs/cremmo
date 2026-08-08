import { getSessionData } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { estadoSuscripcion, finPeriodoActual } from "@/lib/planes";
import { AjustesForm } from "@/components/dashboard/ajustes-form";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const session = await getSessionData();
  const heladeria = session!.heladeria!;

  // El estado y la fecha de corte se calculan aquí para que el cliente pinte
  // siempre lo mismo que renderizó el servidor.
  const suscripcion = {
    estado: estadoSuscripcion(heladeria),
    canceladaEn: heladeria.cancelada_en,
    proximaRenovacion: finPeriodoActual(heladeria).toISOString(),
  };

  return (
    <AjustesForm
      heladeria={heladeria}
      slug={heladeria.slug}
      siteUrl={env.siteUrl}
      esOwner={session!.perfil?.rol === "owner"}
      suscripcion={suscripcion}
    />
  );
}
