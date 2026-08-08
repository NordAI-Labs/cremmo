import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Se muestra en lugar de la carta cuando hay un `?mesa=` en la URL que
 * corresponde a una mesa real, pero sin una sesión de mesa vigente (cookie
 * ausente o caducada). Sustituye a toda la carta, no solo al botón de pedir:
 * hay que volver a pasar por el QR para verla de nuevo.
 */
export function SesionMesaCaducada() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Clock className="h-14 w-14 text-muted-foreground" />
          <CardTitle className="text-2xl">Sesión caducada</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Por seguridad, el acceso a la carta desde este enlace caduca a los
          pocos minutos. Vuelve a escanear el código QR de tu mesa para abrir
          una nueva sesión.
        </CardContent>
      </Card>
    </div>
  );
}
