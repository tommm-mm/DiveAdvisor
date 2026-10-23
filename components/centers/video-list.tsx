"use client";

import { useState } from "react";
import type { Video } from "@/lib/videos";

// YouTube loads (privacy-enhanced domain) only after the visitor clicks play: no third-party request before.
function YouTube({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-foreground">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex size-14 items-center justify-center rounded-full bg-background/90 text-foreground" aria-hidden>
            <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="text-sm">Guarda il video (YouTube)</span>
        </button>
      )}
    </div>
  );
}

export function VideoList({ videos, centerName }: { videos: Video[]; centerName: string }) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      {videos.map((v, i) =>
        v.kind === "youtube" ? (
          <YouTube key={v.id} id={v.id} title={`Video di ${centerName} ${i + 1}`} />
        ) : (
          <a key={v.url} href={v.url} target="_blank" rel="noopener nofollow"
            className="flex aspect-video flex-col items-center justify-center gap-1 rounded-2xl border bg-sand p-4 text-center hover:border-primary">
            <span className="font-medium">Guarda su Instagram</span>
            <span className="text-xs text-muted-foreground">Si apre in una nuova scheda</span>
          </a>
        ),
      )}
    </div>
  );
}
