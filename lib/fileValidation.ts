import { MAX_FILE_BYTES } from "./limits";

export type AllowedExt = "pdf" | "txt" | "csv";

/** MIME types aceptados por extensión. "" solo en csv: Windows a veces no informa el tipo. */
const ALLOWED_MIME: Record<AllowedExt, string[]> = {
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel", ""],
};

/** Extensiones peligrosas: si aparecen en cualquier parte del nombre ("doc.exe.pdf") se rechaza. */
const DANGEROUS_EXT = new Set([
  "exe", "dll", "com", "scr", "msi", "bat", "cmd", "sh", "bash", "zsh", "ps1", "psm1",
  "vbs", "vbe", "js", "jse", "mjs", "wsf", "hta", "jar", "apk", "app", "bin", "run",
  "php", "phtml", "py", "pl", "rb", "cgi", "lnk", "reg", "html", "htm", "svg", "xml",
  "zip", "rar", "7z", "gz", "tar", "iso", "dmg",
]);

/** `tooLarge` permite mostrar un aviso amable en vez de un error rojo. */
export type FileCheck =
  | { ok: true; ext: AllowedExt }
  | { ok: false; error: string; tooLarge?: boolean };

/** Valida nombre, tamaño y MIME declarado. Es la misma regla en cliente y servidor. */
export function validateFileMeta(file: { name: string; size: number; type: string }): FileCheck {
  const name = file.name;
  if (!name || name.length > 255 || /[\u0000-\u001F\\/]/.test(name)) {
    return { ok: false, error: "Nombre de archivo no válido." };
  }

  const parts = name.toLowerCase().split(".");
  if (parts.length < 2) {
    return { ok: false, error: "El archivo no tiene extensión. Usa PDF, TXT o CSV." };
  }
  const ext = parts[parts.length - 1];
  if (ext !== "pdf" && ext !== "txt" && ext !== "csv") {
    return { ok: false, error: "Formato no permitido. Solo se aceptan archivos PDF, TXT o CSV." };
  }
  // Doble extensión: cualquier segmento intermedio peligroso (p. ej. "informe.exe.pdf").
  if (parts.slice(1, -1).some((p) => DANGEROUS_EXT.has(p.trim()))) {
    return { ok: false, error: "Archivo rechazado: doble extensión sospechosa." };
  }

  if (!ALLOWED_MIME[ext].includes(file.type.toLowerCase())) {
    return { ok: false, error: "Archivo rechazado: el tipo real del archivo no coincide con su extensión." };
  }
  if (file.size === 0) return { ok: false, error: "El archivo está vacío." };
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      tooLarge: true,
      error: "Tu archivo es muy grande. Intenta separar solo las páginas de la consigna.",
    };
  }
  return { ok: true, ext };
}

/** Comprueba que un "texto" no sea en realidad un binario o un script renombrado. */
export function looksLikeBinary(text: string): boolean {
  return text.includes("\u0000") || text.startsWith("MZ") || text.startsWith("\u007fELF") || text.startsWith("#!");
}
