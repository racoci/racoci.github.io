import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
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
    footerText: "Analytically and statically built.",
  },
  pt: {
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
      <body className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/10 selection:text-emerald-600 dark:selection:bg-emerald-400/10 dark:selection:text-emerald-400">
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* New Sidebar Layout */}
          <Sidebar lang={lang as "en" | "pt"} />
          
          {/* Main Content Area */}
          <main className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="max-w-7xl xl:max-w-[1450px] mx-auto px-6 py-10 md:py-16 w-full">
              {children}
            </div>

            {/* Footer */}
            <footer className="border-t border-zinc-200/60 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-950 py-8 text-center text-xs text-zinc-500 dark:text-zinc-500 mt-auto">
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
          </main>
        </div>
      </body>
    </html>
  );
}
