import Link from "next/link";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RegistroCompletadoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">¡Pago confirmado!</CardTitle>
        <CardDescription>
          {email
            ? `Hemos enviado un email a ${email} para que actives tu cuenta.`
            : "Hemos enviado un email a tu correo para que actives tu cuenta."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Abre el enlace del email y fija tu contraseña: entrarás directamente
          al panel de tu heladería, ya lista para configurar.
        </p>
        <p>
          Si no lo ves en unos minutos, revisa la carpeta de spam o promociones.
        </p>
        <p className="pt-2 text-center">
          <Link href="/login" className="text-primary hover:underline">
            Ya activé mi cuenta, iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
