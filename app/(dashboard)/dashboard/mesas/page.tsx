import { createClient } from "@/lib/supabase/server";
import { getSessionData } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { MesasManager } from "@/components/dashboard/mesas-manager";
import type { Mesa } from "@/types/database.types";

export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const session = await getSessionData();
  const heladeria = session!.heladeria!;

  const supabase = await createClient();

  const { data: mesas } = await supabase
    .from("mesas")
    .select("*")
    .eq("heladeria_id", heladeria.id)
    .order("created_at");

  return (
    <MesasManager siteUrl={env.siteUrl} mesas={(mesas ?? []) as Mesa[]} />
  );
}
