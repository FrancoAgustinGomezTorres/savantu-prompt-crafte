# SavantU (MVP)

Web app para pegar una consigna y optimizarla. Interfaz oscura e inmersiva con elementos 3D flotando de fondo, un área de texto neumórfica y un botón 3D **Optimizar Consigna**.

Estado: interfaz y endpoint listos. El Meta-Prompt está en `lib/metaPrompt.ts` y `lib/optimizer.ts` lo envía a Google Gemini (`gemini-3.8-flash`) con el AI SDK de Vercel.

## Tecnologías

- Next.js 16 (App Router) + React 19 + TypeScript
- Three.js con `@react-three/fiber` y `@react-three/drei` (escena de fondo)
- framer-motion (animaciones del botón y del panel)
- Tailwind CSS 4 (más CSS propio para el neumorfismo y el botón 3D)

## Cómo ejecutarlo

Requiere Node 20+. Desde esta carpeta (`projecto1`):

```bash
npm install        # solo la primera vez
npm run dev        # http://localhost:3000
```

Otros comandos:

```bash
npm run build      # compilación de producción
npm run start      # sirve la compilación
npm run typecheck  # comprobación de tipos
```

Crea `.env.local` (copia de `.env.example`) con tu clave: `GOOGLE_GENERATIVE_AI_API_KEY=...` (clave gratuita de Google AI Studio). Reinicia `npm run dev` tras cambiarla.

## Estructura

```
projecto1/
├── app/
│   ├── layout.tsx            Layout raíz (idioma, metadatos)
│   ├── page.tsx              Página principal: fondo 3D + título + PromptStudio
│   ├── globals.css           Tema oscuro, neumorfismo (.neu-inset, .neu-raised) y botón 3D (.btn3d)
│   └── api/optimize/route.ts Endpoint POST /api/optimize
├── components/
│   ├── BackgroundScene.tsx   Carga la escena 3D solo en cliente (sin SSR)
│   ├── Scene3D.tsx           Canvas de Three.js: figuras wireframe flotantes, estrellas y parallax con el ratón
│   └── PromptStudio.tsx      Textarea, botón "Optimizar Consigna" y panel de resultado
├── lib/
│   ├── types.ts              Tipos de petición y respuesta
│   ├── metaPrompt.ts         Aquí va el Meta-Prompt (vacío por ahora)
│   └── optimizer.ts          optimizePrompt(): punto de integración del LLM
└── .env.example              Variables de entorno
```

## API

`POST /api/optimize`

```json
{ "prompt": "tu consigna" }
```

Respuesta `200`:

```json
{ "optimized": "consigna optimizada" }
```

Errores: `400` (JSON inválido o consigna vacía), `413` (más de 8000 caracteres), `500` (fallo al optimizar). El cuerpo del error es `{ "error": "mensaje" }`.

## Meta-Prompt y LLM

- `lib/metaPrompt.ts`: `META_PROMPT`, la instrucción de sistema. Se edita aquí.
- `lib/optimizer.ts`: `generateText` del AI SDK con `google("gemini-3.8-flash")`, `system: META_PROMPT` y la consigna como `prompt`. Para cambiar de modelo, cambia ese argumento.
- La clave `GOOGLE_GENERATIVE_AI_API_KEY` solo se lee en el servidor. Si falta, el endpoint responde 500.

## Seguridad

- **Archivos** (`lib/fileValidation.ts`): máx. 25 MB (si se pasa, aviso amable en ámbar), solo `.pdf`/`.txt`/`.csv`, MIME coherente con la extensión, rechazo de doble extensión peligrosa (`informe.exe.pdf`), cabecera `%PDF` real en PDF y detección de binarios o scripts renombrados como texto. **Los archivos se procesan en el navegador y nunca se suben al servidor.**
- **Extracción en el cliente** (`lib/pdfText.ts`, `pdfjs-dist`): lee página a página y se detiene al reunir 15.000 caracteres (corte en final de párrafo o frase). Máx. 400 páginas y 45 s por PDF. TXT/CSV leen solo el principio del archivo. Si se omiten partes, la UI avisa.
- **Prompt injection**: la regla crítica está al final de `META_PROMPT` (`lib/metaPrompt.ts`). Reduce el riesgo, pero ningún prompt lo garantiza al 100 %.
- **Rate limit** (`lib/rateLimit.ts`): en memoria, por IP. `/api/optimize`: 5 peticiones/minuto; responde `429` con `Retry-After`. Con varias instancias o serverless hay que usar Redis/Upstash.
- **Sanitización** (`lib/sanitize.ts`): se aplica en el cliente, en el servidor (entrada, texto del PDF y respuesta del modelo). Quita caracteres de control, invisibles/bidi y bloques `<script>`, `<iframe>`, `<style>`, etc. React escapa el texto al pintarlo y nunca se usa `dangerouslySetInnerHTML`.
- **Cabeceras** (`next.config.ts`): `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. No hay CSP todavía.
- Detrás de un proxy, `x-forwarded-for` debe venir del proxy de confianza; si no, se puede falsear para saltarse el límite.

## Notas

- Los imports son relativos (`../lib/...`), no con el alias `@/`, porque el alias no se resolvía en este entorno.
- `node_modules/` está en el `.claudesignore` de la bóveda.
