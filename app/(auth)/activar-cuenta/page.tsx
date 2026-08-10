import { Suspense } from "react";
import { ActivarCuentaForm } from "./activar-cuenta-form";

export default function ActivarCuentaPage() {
  return (
    <Suspense fallback={null}>
      <ActivarCuentaForm />
    </Suspense>
  );
}
