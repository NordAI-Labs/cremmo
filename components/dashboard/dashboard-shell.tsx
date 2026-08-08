"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IceCream,
  ClipboardList,
  BarChart3,
  BookOpen,
  Tag,
  QrCode,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Heladeria } from "@/types/database.types";

const NAV = [
  { href: "/dashboard/comandas", label: "Comandas", icon: ClipboardList },
  { href: "/dashboard/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/dashboard/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/dashboard/promociones", label: "Promociones", icon: Tag },
  { href: "/dashboard/mesas", label: "Mesas y QR", icon: QrCode },
  { href: "/dashboard/ajustes", label: "Ajustes", icon: Settings },
];

function Brand({
  heladeria,
  compact = false,
}: {
  heladeria: Heladeria;
  compact?: boolean;
}) {
  if (heladeria.logo_url) {
    return (
      <div className="relative h-10 w-[160px]">
        <Image
          src={heladeria.logo_url}
          alt={`Logo de ${heladeria.nombre}`}
          fill
          className="object-contain object-left"
          sizes={compact ? "120px" : "160px"}
          unoptimized
          priority
        />
      </div>
    );
  }

  return (
    <>
      <IceCream className={compact ? "h-5 w-5 text-primary" : "h-6 w-6 text-primary"} />
      <span className="truncate">{heladeria.nombre}</span>
    </>
  );
}

export function DashboardShell({
  heladeria,
  email,
  onLogout,
  children,
}: {
  heladeria: Heladeria;
  email: string | null;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-card p-4">
        <div className="mb-6 flex items-center gap-2 px-2 font-bold">
          <Brand heladeria={heladeria} />
        </div>
        {nav}
        <div className="mt-auto space-y-2 pt-4">
          <Link
            href={`/${heladeria.slug}`}
            target="_blank"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            Ver carta pública
          </Link>
          <div className="px-3 text-xs text-muted-foreground truncate">
            {email}
          </div>
          <form action={onLogout}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="md:hidden flex items-center justify-between border-b bg-card p-4">
        <div className="flex items-center gap-2 font-bold">
          <Brand heladeria={heladeria} compact />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {open && (
        <div className="md:hidden border-b bg-card p-4 space-y-4">
          {nav}
          <div className="space-y-2 border-t pt-4">
            <Link
              href={`/${heladeria.slug}`}
              target="_blank"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
              Ver carta pública
            </Link>
            <form action={onLogout}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
