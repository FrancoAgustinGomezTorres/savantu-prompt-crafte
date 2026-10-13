"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "copied" | "error";

export default function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    let next: Status = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = "error";
    }
    setStatus(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2000);
  }

  const label =
    status === "copied" ? "¡Copiado! ✓" : status === "error" ? "No se pudo copiar" : "Copiar";

  return (
    <button
      type="button"
      onClick={copy}
      className="neu-btn"
      data-status={status}
      aria-label="Copiar prompt optimizado al portapapeles"
    >
      {status === "idle" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
