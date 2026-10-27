"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

export type TurnstileHandle = { reset: () => void };

// Cloudflare's script auto-renders widgets only on first page load; after client-side navigation
// it would leave the box empty. So we render explicitly, on mount or when the script finishes loading.
export const Turnstile = forwardRef<TurnstileHandle, { siteKey: string }>(function Turnstile({ siteKey }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  const render = useCallback(() => {
    // No key configured (production before the real Turnstile keys exist): never let the widget throw,
    // an uncaught error here takes down the whole page. The server still fails closed on submit.
    if (!siteKey || !box.current || !window.turnstile || id.current) return;
    try {
      id.current = window.turnstile.render(box.current, { sitekey: siteKey, size: "flexible", language: "it" });
    } catch {
      id.current = null;
    }
  }, [siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, [render]);

  // A token is single-use: forms reset the widget after each failed attempt.
  useImperativeHandle(ref, () => ({ reset: () => { if (id.current) window.turnstile?.reset(id.current); } }), []);

  if (!siteKey) {
    return <p className="text-sm text-muted-foreground">Invio temporaneamente non disponibile: verifica anti-spam in configurazione.</p>;
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
      <div ref={box} />
    </>
  );
});
