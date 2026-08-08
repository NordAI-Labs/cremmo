import { Fragment } from "react";
import Link from "next/link";
import { PAGINAS_LEGALES, TITULAR } from "@/lib/legal";
import { cn } from "@/lib/utils";

/** Enlaces a los textos legales, en línea. Para pies compactos. */
export function EnlacesLegales({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-center gap-y-2 text-foreground/70",
        className
      )}
    >
      {PAGINAS_LEGALES.map((p, i) => (
        <Fragment key={p.href}>
          {i > 0 && (
            <span aria-hidden className="mx-3 text-border">
              ·
            </span>
          )}
          <Link
            href={p.href}
            className="underline decoration-foreground/20 underline-offset-4 hover:text-foreground hover:decoration-foreground/60"
          >
            {p.titulo}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}

/** Pie completo de la web pública. */
export function PieLegal() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        <EnlacesLegales />
        <p className="mt-4">
          © {new Date().getFullYear()} {TITULAR.marca} · {TITULAR.nombre} ·
          Hecho para heladerías de España
        </p>
      </div>
    </footer>
  );
}
