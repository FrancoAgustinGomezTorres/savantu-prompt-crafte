import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SavantU: AI Prompt Crafter",
  description:
    "SavantU: AI Prompt Crafter. Pega tu consigna y obtén un prompt optimizado para sacarle el máximo partido a la IA.",
  openGraph: {
    title: "SavantU: AI Prompt Crafter",
    description: "Convierte tu consigna en un prompt optimizado.",
    siteName: "SavantU: AI Prompt Crafter",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
