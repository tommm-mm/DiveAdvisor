import { cn } from "@/lib/utils";

// Stand-in for centre photos until real ones exist: a calm sea/lake tone picked from the name,
// so cards look varied but stable. Swap for <Image> when centres upload photos.
const TONES = ["bg-[#b9dde6]", "bg-[#c4e3dc]", "bg-[#cfe0e8]", "bg-[#bcd6cf]", "bg-[#d5e6e1]", "bg-[#c2d9e3]"];

export function PhotoTone({ seed, className, children }: { seed: string; className?: string; children?: React.ReactNode }) {
  const i = [...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length;
  return <div className={cn(TONES[i], "relative", className)} aria-hidden={children ? undefined : true}>{children}</div>;
}
