import Image from "next/image";
import { Package } from "lucide-react";

/** Product photo of an order line, with a placeholder when the product has no image */
export default function OrderThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-12 h-16 sm:w-14 sm:h-[4.5rem] rounded-sm overflow-hidden bg-[var(--color-champagne-cream)] shrink-0 flex items-center justify-center">
      {src ? (
        <Image src={src} alt={alt} fill sizes="56px" className="object-cover" />
      ) : (
        <Package size={20} style={{ color: "var(--text-disabled)" }} />
      )}
    </div>
  );
}
