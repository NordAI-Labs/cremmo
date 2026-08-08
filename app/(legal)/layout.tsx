import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { PieLegal } from "@/components/legal/pie-legal";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="relative h-9 w-[150px]">
            <Image
              src="/cremmo-logo.png"
              alt="Cremmo"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:py-14">
        {children}
      </main>

      <PieLegal />
    </div>
  );
}
