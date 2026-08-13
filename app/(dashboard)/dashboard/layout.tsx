import { redirect } from "next/navigation";
import { getSessionData } from "@/lib/auth/session";
import { cerrarSesion } from "@/app/(auth)/actions";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SuscripcionBloqueada } from "@/components/dashboard/suscripcion-bloqueada";
import { AvisoImpago } from "@/components/dashboard/aviso-impago";
import { ModalValoracion } from "@/components/dashboard/modal-valoracion";
import { estadoSuscripcion } from "@/lib/planes";
import { tocaPedirValoracion, yaValoroLaApp } from "@/lib/valoraciones";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionData();
  if (!session) redirect("/login");
  if (!session.perfil || !session.heladeria) redirect("/onboarding");

  const esOwner = session.perfil.rol === "owner";
  const estado = estadoSuscripcion(session.heladeria);

  // Sin suscripción que lo sostenga, el panel no se abre: o no se ha pagado
  // nunca, o el periodo ya terminó.
  if (estado === "pendiente" || estado === "vencida") {
    return (
      <SuscripcionBloqueada
        plan={session.heladeria.plan}
        vencidaEn={estado === "vencida" ? session.heladeria.cancelada_en : null}
        esOwner={esOwner}
        onLogout={cerrarSesion}
      />
    );
  }

  // Solo se le pide al propietario, a partir de los 15 días del alta, y deja
  // de pedirse en cuanto ha enviado una valoración (para siempre).
  const pedirValoracion =
    esOwner &&
    tocaPedirValoracion(session.heladeria) &&
    !(await yaValoroLaApp(session.heladeria.id));

  return (
    <DashboardShell
      heladeria={session.heladeria}
      email={session.email}
      onLogout={cerrarSesion}
    >
      {estado === "impago" && <AvisoImpago esOwner={esOwner} />}
      {pedirValoracion && <ModalValoracion />}
      {children}
    </DashboardShell>
  );
}
