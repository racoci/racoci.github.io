import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dict = {
  en: {
    about: "About",
    now: "Now",
    projects: "Projects",
    garden: "Garden:",
    systems: "⚙️ Systems Engineering",
    essays: "🧠 Essays & Logic",
    lab: "🧪 Laboratory / Logistics",
    finance: "📈 B3 Screener",
    footerText: "Analytically and statically built.",
  },
  pt: {
    about: "Sobre",
    now: "Agora",
    projects: "Projetos",
    garden: "Jardim:",
    systems: "⚙️ Engenharia de Sistemas",
    essays: "🧠 Ensaios e Lógica",
    lab: "🧪 Laboratório / Logística",
    finance: "📈 Screener B3",
    footerText: "Construído de forma analítica e estática.",
  },
};

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "pt" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "pt" ? "Lucas Racoci | Jardim Digital" : "Lucas Racoci | Digital Garden",
    description:
      lang === "pt"
        ? "Portfólio técnico e ensaios profundos sobre Engenharia de Sistemas, Lógica, Filosofia e Logística de Vida."
        : "Technical portfolio and deep essays on Systems Engineering, Logic, Philosophy, and Life Logistics.",
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const isPt = lang === "pt";
  const t = isPt ? dict.pt : dict.en;

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/10 selection:text-emerald-600 dark:selection:bg-emerald-400/10 dark:selection:text-emerald-400">
        {/* Header / Navigation */}
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo / Home Link */}
            <Link href={`/${lang}`} className="group flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 group-hover:scale-125 transition-transform" />
              <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
                lucas <span className="text-emerald-600 dark:text-emerald-400 font-normal">racoci</span>
              </span>
            </Link>

            {/* Primary Menu & Language Switcher */}
            <div className="flex items-center gap-5 sm:gap-6">
              <nav className="flex items-center gap-4 sm:gap-5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <Link
                  href={`/${lang}/about`}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  {t.about}
                </Link>
                <Link
                  href={`/${lang}/now`}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  {t.now}
                </Link>
                <Link
                  href={`/${lang}/projects`}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  {t.projects}
                </Link>
              </nav>
              <span className="text-zinc-300 dark:text-zinc-800">|</span>
              <LanguageSwitcher currentLang={lang} />
            </div>
          </div>

          {/* Secondary Navigation (Content Pillars) */}
          <div className="border-t border-zinc-200/40 dark:border-zinc-800/30 bg-zinc-100/50 dark:bg-zinc-900/20 py-2">
            <div className="max-w-4xl mx-auto px-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 overflow-x-auto scrollbar-none">
              <span className="whitespace-nowrap">{t.garden}</span>
              <Link
                href={`/${lang}/systems`}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                {t.systems}
              </Link>
              <span className="text-zinc-300 dark:text-zinc-800">•</span>
              <Link
                href={`/${lang}/essays`}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                {t.essays}
              </Link>
              <span className="text-zinc-300 dark:text-zinc-800">•</span>
              <Link
                href={`/${lang}/lab`}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                {t.lab}
              </Link>
              <span className="text-zinc-300 dark:text-zinc-800">•</span>
              <Link
                href={`/${lang}/finance`}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                {t.finance}
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-10 md:py-16">
          <article className="prose dark:prose-invert prose-emerald max-w-none">
            {children}
          </article>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-950 py-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
          <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              © {new Date().getFullYear()} Lucas Racoci. {t.footerText}
            </p>
            <p className="flex items-center gap-3">
              <a
                href="https://github.com/racoci"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline underline-offset-2"
              >
                GitHub
              </a>
              <span>•</span>
              <span className="text-zinc-400 dark:text-zinc-700">
                CC BY-NC-SA 4.0 License
              </span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
