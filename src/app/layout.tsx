import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lucas Racoci | Jardim Digital",
  description: "Portfólio técnico e ensaios profundos sobre Engenharia de Sistemas, Lógica, Filosofia e Logística de vida.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/10 selection:text-emerald-600 dark:selection:bg-emerald-400/10 dark:selection:text-emerald-400">
        {/* Header / Navegação */}
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo / Link Home */}
            <Link href="/" className="group flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 group-hover:scale-125 transition-transform" />
              <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
                lucas <span className="text-emerald-600 dark:text-emerald-400 font-normal">racoci</span>
              </span>
            </Link>

            {/* Menu Primário */}
            <nav className="flex items-center gap-5 sm:gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <Link href="/sobre" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Sobre
              </Link>
              <Link href="/agora" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Agora
              </Link>
              <Link href="/projetos" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Projetos
              </Link>
            </nav>
          </div>
          
          {/* Navegação Secundária (Frentes de Conteúdo) */}
          <div className="border-t border-zinc-200/40 dark:border-zinc-800/30 bg-zinc-100/50 dark:bg-zinc-900/20 py-2">
            <div className="max-w-4xl mx-auto px-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 overflow-x-auto scrollbar-none">
              <span className="whitespace-nowrap">Jardim:</span>
              <Link href="/sistemas" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
                ⚙️ Engenharia de Sistemas
              </Link>
              <span className="text-zinc-300 dark:text-zinc-800">•</span>
              <Link href="/ensaios" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
                🧠 Ensaios e Lógica
              </Link>
              <span className="text-zinc-300 dark:text-zinc-800">•</span>
              <Link href="/laboratorio" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
                🧪 Laboratório / Logística
              </Link>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-10 md:py-16">
          <article className="prose dark:prose-invert prose-emerald max-w-none">
            {children}
          </article>
        </main>

        {/* Rodapé */}
        <footer className="border-t border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-950 py-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Lucas Racoci. Construído de forma analítica e estática.</p>
            <p className="flex items-center gap-3">
              <a 
                href="https://github.com/lucasracoci" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline underline-offset-2"
              >
                GitHub
              </a>
              <span>•</span>
              <span className="text-zinc-400 dark:text-zinc-700">Licença CC BY-NC-SA 4.0</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
