import { Suspense } from "react";
import { ConfirmacionContent } from "./confirmacion-content";

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmacionContent />
    </Suspense>
  );
}
