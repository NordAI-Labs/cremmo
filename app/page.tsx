import Link from "next/link";
import Image from "next/image";
import { Check, IceCream, QrCode, LayoutDashboard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PLANES, formatPrecioPlan } from "@/lib/planes";
import { PieLegal } from "@/components/legal/pie-legal";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="relative h-14 w-[220px]">
            <Image
              src="/cremmo-logo.png"
              alt="Cremmo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="#precios">Precios</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
        <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
          SaaS multi-tenant para heladerías
        </span>
        <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
          Tu heladería,{" "}
          <span className="text-primary">digital en minutos</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Tus clientes escanean el QR de la mesa, piden desde su móvil y tú
          gestionas las comandas en tiempo real. Catálogo, personalización,
          promociones y estadísticas, todo en un mismo sitio.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/registro">Empezar gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: QrCode,
            title: "Pedidos por QR",
            desc: "Cada mesa con su QR. El cliente pide sin descargar nada.",
          },
          {
            icon: IceCream,
            title: "Personalización",
            desc: "Sabores, tamaños y toppings con precios por opción.",
          },
          {
            icon: LayoutDashboard,
            title: "Comandas en vivo",
            desc: "Panel en tiempo real con estados de cada pedido.",
          },
          {
            icon: BarChart3,
            title: "Estadísticas",
            desc: "Ventas, productos más pedidos y facturación del mes.",
          },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="precios" className="border-t bg-accent/20 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Precios sin sorpresas
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Sin permanencia y sin comisiones por pedido. Elige el plan que
              encaje con tu heladería.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANES.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.destacado && "border-primary shadow-md",
                  !plan.disponible && "bg-muted/30"
                )}
              >
                <CardContent className="flex flex-1 flex-col pt-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{plan.nombre}</h3>
                    {plan.destacado && <Badge>Recomendado</Badge>}
                    {!plan.disponible && (
                      <Badge variant="secondary">Próximamente disponible</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.descripcion}
                  </p>

                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {formatPrecioPlan(plan.precio)}
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </p>
                  <p className="text-xs text-muted-foreground">IVA incluido</p>

                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {plan.caracteristicas.map((c) => (
                      <li key={c} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {c}
                      </li>
                    ))}
                  </ul>

                  {plan.disponible ? (
                    <Button asChild size="lg" className="mt-8 w-full">
                      <Link href={`/registro?plan=${plan.id}`}>
                        Empezar con {plan.nombre}
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" className="mt-8 w-full" disabled>
                      Próximamente disponible
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <PieLegal />
    </main>
  );
}
