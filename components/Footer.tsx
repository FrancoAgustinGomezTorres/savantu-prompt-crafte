const LINKEDIN_URL = "https://www.linkedin.com/in/franco-agustin-gomez-torres-9341213b8/";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full px-6 pb-6 pt-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-white/40 sm:text-sm">
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn de Franco Gomez"
          className="group inline-flex items-center gap-3 transition-colors duration-300 hover:text-[#38e1ff]"
        >
          <span>Proyecto web desarrollado por Franco Gomez</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            className="shrink-0 transition-all duration-300 group-hover:text-[#0A66C2] group-hover:drop-shadow-[0_0_6px_rgba(56,225,255,0.7)]"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
