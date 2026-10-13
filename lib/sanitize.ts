// Caracteres de control (excepto \t, \n; \r se normaliza antes) y C1.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Invisibles usados para ocultar texto o invertir el sentido de lectura (bidi, zero-width).
// Se conservan U+200C/U+200D: forman parte de emojis y de varios alfabetos.
const INVISIBLE = /[​‎‏‪-‮⁠-⁤⁦-⁩﻿]/g;
// Bloques ejecutables: se elimina etiqueta y contenido.
const ACTIVE_BLOCK = /<\s*(script|style|iframe|object|embed|noscript)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
// Etiquetas activas sueltas (sin cierre) y de inyección de documento.
const ACTIVE_TAG = /<\s*\/?\s*(script|style|iframe|object|embed|noscript|link|meta|base|form|svg|math|frame|frameset)\b[^>]*>?/gi;

/**
 * Limpia texto de usuario o extraído de un archivo.
 * No toca `<`/`>` genéricos: una consigna de programación puede contener código legítimo.
 * El render en React ya escapa el texto; esto es defensa en profundidad.
 */
export function sanitizeText(input: string): string {
  let text = input.replace(/\r\n?/g, "\n").replace(CONTROL, "").replace(INVISIBLE, "");

  // Repetimos hasta estabilizar para que "<scr<script>ipt>" no reconstruya una etiqueta.
  for (let i = 0; i < 5; i++) {
    const next = text.replace(ACTIVE_BLOCK, "").replace(ACTIVE_TAG, "");
    if (next === text) break;
    text = next;
  }
  return text.normalize("NFC");
}
