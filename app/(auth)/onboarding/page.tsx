import { redirect } from "next/navigation";
import { getSessionData } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await getSessionData();
  if (!session) redirect("/login");
  // Si ya tiene heladería, al panel.
  if (session.perfil) redirect("/dashboard");

  return <OnboardingForm />;
}
