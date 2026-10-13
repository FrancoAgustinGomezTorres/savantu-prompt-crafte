/** Máximo de caracteres de una consigna (cliente y servidor). */
export const MAX_PROMPT_CHARS = 20000;

/** Tamaño máximo de un archivo adjunto: 25 MB (se procesa en el navegador, no se sube). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Caracteres que se toman de un archivo adjunto (control de tokens de Gemini). */
export const MAX_EXTRACTED_CHARS = 15000;

/** Páginas de PDF que se recorren como máximo (evita colgarse con PDFs escaneados enormes). */
export const MAX_PDF_PAGES = 400;

/** Tamaño máximo del cuerpo JSON de /api/optimize (margen para texto multibyte). */
export const MAX_JSON_BYTES = 200 * 1024;

/** Rate limit: peticiones por ventana, por IP. */
export const OPTIMIZE_LIMIT = { max: 5, windowMs: 60_000 };
