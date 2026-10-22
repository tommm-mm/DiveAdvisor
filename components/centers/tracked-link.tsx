"use client";

// Records a WhatsApp/phone click as a lead without delaying navigation (sendBeacon survives page unload).
export function TrackedLink({ centerId, channel, ...props }: React.ComponentProps<"a"> & {
  centerId: string; channel: "whatsapp" | "phone";
}) {
  return (
    <a
      {...props}
      onClick={() => {
        const body = new Blob([JSON.stringify({ centerId, channel })], { type: "application/json" });
        navigator.sendBeacon?.("/api/contatto", body);
      }}
    />
  );
}
