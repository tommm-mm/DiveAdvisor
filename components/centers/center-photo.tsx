import Image from "next/image";
import { PhotoTone } from "@/components/centers/photo-tone";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

type Props = {
  photo?: { path: string; alt: string | null } | null;
  seed: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
};

// A centre photo when there is one, the calm colour block otherwise (same box either way).
export function CenterPhoto({ photo, seed, alt, className, sizes, priority }: Props) {
  if (!photo) return <PhotoTone seed={seed} className={className} />;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image src={photoUrl(photo.path)} alt={photo.alt || alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
