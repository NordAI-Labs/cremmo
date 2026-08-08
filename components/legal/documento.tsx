import { ULTIMA_ACTUALIZACION } from "@/lib/legal";

/**
 * Envoltorio de los textos legales. Da el estilo tipográfico a los elementos
 * hijos para que cada documento se escriba como HTML semántico plano, sin
 * repetir clases en cada párrafo.
 */
export function Documento({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
      {descripcion && (
        <p className="mt-2 text-muted-foreground">{descripcion}</p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: {ULTIMA_ACTUALIZACION}
      </p>

      <div
        className="
          mt-8 space-y-4 leading-relaxed text-muted-foreground
          [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground
          [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
          [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
          [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5
          [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
          [&_th]:border [&_th]:bg-muted/50 [&_th]:p-2 [&_th]:text-left
          [&_th]:font-semibold [&_th]:text-foreground
          [&_td]:border [&_td]:p-2 [&_td]:align-top
        "
      >
        {children}
      </div>
    </article>
  );
}

/** Tabla con scroll horizontal en móvil. */
export function TablaScroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
