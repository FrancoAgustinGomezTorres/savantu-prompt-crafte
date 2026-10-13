import { MAX_PDF_PAGES } from "./limits";

export type ExtractResult = { text: string; partial: boolean };

const TIMEOUT_MS = 45_000;

/**
 * Extrae texto de un PDF en el navegador con pdfjs-dist (el archivo no sale del equipo).
 * Va página por página y se detiene al reunir `maxChars`, para no leer un libro entero.
 * Solo debe llamarse en el cliente.
 */
export async function extractPdfText(file: File, maxChars: number): Promise<ExtractResult> {
  // Comprobación del contenido real: los PDF empiezan con "%PDF".
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF") {
    throw new Error("El archivo no es un PDF válido.");
  }

  // Import dinámico: pdfjs necesita APIs del navegador y no debe cargarse en el servidor.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  // Corta si el PDF tarda demasiado (PDF malicioso o enorme).
  const timer = setTimeout(() => void task.destroy(), TIMEOUT_MS);

  try {
    const pdf = await task.promise;
    const lastPage = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pages: string[] = [];
    let length = 0;
    let reached = 0;

    for (let n = 1; n <= lastPage && length < maxChars; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      page.cleanup(); // libera memoria de la página
      const text = content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      reached = n;
      if (text) {
        pages.push(text);
        length += text.length + 2;
      }
    }

    const partial = reached < pdf.numPages || length > maxChars;
    return { text: pages.join("\n\n"), partial };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "PasswordException") throw new Error("El PDF está protegido con contraseña.");
    console.error("[pdfText] Error al leer el PDF:", error);
    throw new Error("No se pudo leer el PDF. Puede estar dañado.");
  } finally {
    clearTimeout(timer);
    void task.destroy();
  }
}

/** Corta a `max` caracteres, preferiblemente en un final de párrafo o de frase cercano. */
export function smartCut(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const window = Math.floor(max * 0.9);
  const para = slice.lastIndexOf("\n\n");
  if (para >= window) return slice.slice(0, para).trimEnd();
  const sentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(".\n"));
  if (sentence >= window) return slice.slice(0, sentence + 1);
  return slice.trimEnd();
}
