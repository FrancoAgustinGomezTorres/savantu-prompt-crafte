"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OptimizeResponse } from "../lib/types";
import CopyButton from "./CopyButton";
import FileDropzone from "./FileDropzone";
import { sanitizeText } from "../lib/sanitize";
import { MAX_PROMPT_CHARS as MAX_CHARS } from "../lib/limits";

export default function PromptStudio() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  // El archivo era más largo que el tope y solo se tomó el principio.
  const [omitted, setOmitted] = useState(false);

  // Inserta el texto del archivo en el cuadro; si ya había texto, lo añade debajo.
  function insertFileText(text: string, _fileName: string, partial: boolean) {
    const joined = prompt.trim() ? `${prompt.trimEnd()}\n\n${text}` : text;
    setOmitted(partial);
    setTruncated(joined.length > MAX_CHARS);
    setPrompt(joined.slice(0, MAX_CHARS));
  }

  async function optimize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sanitizeText(prompt) }),
      });
      const data = (await res.json().catch(() => ({ error: "Respuesta inválida del servidor" }))) as
        | OptimizeResponse
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Error inesperado");
      }
      setResult(data.optimized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const empty = prompt.trim().length === 0;

  return (
    <section className="flex w-full flex-col items-center gap-8">
      <div className="-mb-4 w-full">
        <FileDropzone onText={insertFileText} />
      </div>

      <motion.div
        className="neu-inset w-full p-2"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <textarea
          value={prompt}
          onChange={(e) => {
            setTruncated(false);
            if (!e.target.value) setOmitted(false);
            setPrompt(e.target.value.slice(0, MAX_CHARS));
          }}
          placeholder="Pega aquí tu consigna..."
          aria-label="Consigna"
          rows={12}
          className="h-72 w-full resize-none rounded-[24px] bg-transparent p-6 text-lg leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
        />
        <div className="flex justify-between gap-3 px-6 pb-3 text-xs text-[var(--muted)]">
          <span className="text-amber-400">
            {truncated
              ? `El texto se recortó a ${MAX_CHARS.toLocaleString("es")} caracteres.`
              : omitted && "Texto extraído (se omitieron partes para optimizar el análisis)"}
          </span>
          <span className="shrink-0">
            {prompt.length.toLocaleString("es")} / {MAX_CHARS.toLocaleString("es")}
          </span>
        </div>
      </motion.div>

      <motion.button
        type="button"
        className="btn3d"
        onClick={optimize}
        disabled={empty || loading}
        data-loading={loading}
        whileHover={{ rotateX: -8, rotateY: 6, scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <span className="face">
          {loading ? "Optimizando..." : "Optimizar Consigna"}
        </span>
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            role="alert"
            className="text-sm text-red-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
        {result && (
          <motion.div
            key="result"
            className="neu-raised w-full p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-2)]">
                Consigna optimizada
              </h2>
              <CopyButton text={result} />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
              {result}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
