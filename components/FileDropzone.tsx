"use client";

import { useRef, useState } from "react";
import { looksLikeBinary, validateFileMeta } from "../lib/fileValidation";
import { MAX_EXTRACTED_CHARS } from "../lib/limits";
import { extractPdfText, smartCut } from "../lib/pdfText";
import { sanitizeText } from "../lib/sanitize";

type Props = {
  /** Recibe el texto extraído (ya recortado); `partial` indica que se omitieron partes. */
  onText: (text: string, fileName: string, partial: boolean) => void;
};

type State =
  | { kind: "idle" }
  | { kind: "loading"; name: string }
  | { kind: "done"; name: string; chars: number; partial: boolean }
  | { kind: "warn"; message: string } // aviso amable (p. ej. archivo muy grande)
  | { kind: "error"; message: string };

const ACCEPT = ".pdf,.txt,.csv,application/pdf,text/plain,text/csv";

/** Lee solo el principio del archivo: un TXT/CSV de 25 MB no se carga entero en memoria. */
function readHeadAsText(file: File, maxChars: number): Promise<{ text: string; partial: boolean }> {
  // UTF-8 usa hasta 4 bytes por carácter; leemos algo más de lo necesario.
  const bytes = maxChars * 4;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        // Si el corte cayó a mitad de un carácter multibyte, quita el "�" final.
        text: String(reader.result ?? "").replace(/�+$/, ""),
        partial: file.size > bytes,
      });
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.readAsText(file.slice(0, bytes));
  });
}

export default function FileDropzone({ onText }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    // Rechazo inmediato: extensión, doble extensión, MIME y tamaño (25 MB).
    const check = validateFileMeta(file);
    if (!check.ok) {
      setState(
        check.tooLarge
          ? { kind: "warn", message: check.error }
          : { kind: "error", message: check.error },
      );
      return;
    }

    setState({ kind: "loading", name: file.name });
    try {
      // Todo ocurre en el navegador: el archivo no se envía al servidor.
      let raw: string;
      let partial: boolean;
      if (check.ext === "pdf") {
        ({ text: raw, partial } = await extractPdfText(file, MAX_EXTRACTED_CHARS));
      } else {
        ({ text: raw, partial } = await readHeadAsText(file, MAX_EXTRACTED_CHARS));
        // Un .txt/.csv con bytes nulos o cabecera de ejecutable es un binario disfrazado.
        if (looksLikeBinary(raw)) throw new Error("Archivo rechazado: el contenido no es texto plano.");
      }

      // Primero sanitizar y después recortar, para que el límite cuente texto limpio.
      const clean = sanitizeText(raw).trim();
      if (!clean) throw new Error("El archivo no contiene texto seleccionable (¿es un escaneo?).");
      const text = smartCut(clean, MAX_EXTRACTED_CHARS);
      partial = partial || text.length < clean.length;

      onText(text, file.name, partial);
      setState({ kind: "done", name: file.name, chars: text.length, partial });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Error inesperado" });
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  const loading = state.kind === "loading";

  return (
    <div className="w-full">
      <div
        className="dropzone"
        data-dragging={dragging}
        data-loading={loading}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
        <p className="text-sm text-[var(--muted)]">
          Arrastra un archivo aquí <span className="hidden sm:inline">(PDF, TXT o CSV)</span>
        </p>
        <button
          type="button"
          className="neu-btn"
          onClick={() => input.current?.click()}
          disabled={loading}
        >
          {loading ? "Leyendo..." : "Adjuntar archivo"}
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = ""; // permite volver a subir el mismo archivo
          }}
        />
      </div>

      <p className="mt-2 min-h-5 px-2 text-center text-xs" role={state.kind === "error" ? "alert" : "status"} aria-live="polite">
        {state.kind === "loading" && (
          <span className="text-[var(--muted)]">Leyendo {state.name}...</span>
        )}
        {state.kind === "done" && (
          <span className="text-green-400">
            ✓ {state.name} — {state.chars.toLocaleString("es")} caracteres añadidos al cuadro de texto
          </span>
        )}
        {state.kind === "warn" && <span className="text-amber-400">📎 {state.message}</span>}
        {state.kind === "error" && (
          <span className="font-semibold text-red-400">⚠ {state.message}</span>
        )}
      </p>
    </div>
  );
}
