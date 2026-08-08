import Link from "next/link";
import Image from "next/image";
import { EnlacesLegales } from "@/components/legal/pie-legal";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 relative h-20 w-[340px]">
        <Image
          src="/cremmo-logo.png"
          alt="Cremmo"
          fill
          className="object-contain object-center"
          priority
        />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <EnlacesLegales className="mt-8 max-w-md text-xs text-muted-foreground" />
    </div>
  );
}
