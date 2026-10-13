import BackgroundScene from "../components/BackgroundScene";
import Footer from "../components/Footer";
import PromptStudio from "../components/PromptStudio";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <BackgroundScene />
      <div className="relative z-10 mx-auto flex w-full flex-1 max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-white via-[#b9a8ff] to-[#38e1ff] bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
            SavantU
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.35em] text-[#38e1ff]/70 sm:text-base">
            AI Prompt Crafter
          </p>
          <p className="mt-4 text-[var(--muted)]">
            Pega tu consigna. Nosotros la afinamos.
          </p>
        </header>
        <PromptStudio />
      </div>
      <Footer />
    </main>
  );
}
