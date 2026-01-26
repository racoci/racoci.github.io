import Link from "next/link";
import InteractiveHero from "../../components/InteractiveHero";
import SudokuMiniWidget from "../../components/SudokuMiniWidget";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const dict = {
  en: {
    title: "Lucas Racoci's Digital Garden",
    intro:
      "This space is undergoing a complete restructuring and migration to a modern static architecture using Next.js 16, Tailwind CSS v4, and MDX.",
    warningTitle: "Main Page Under Construction / Development",
    warningText:
      "This home page is a temporary placeholder serving as a proof of concept to test the continuous integration and delivery (CI/CD) workflow on GitHub Pages. New sections and articles will be planted and cultivated here in the coming days.",
    sowingTitle: "Sowing the Garden",
    sowingText:
      "While the main home page is under construction, some essential branches have already been established and can be explored in the top menu:",
    aboutTitle: "About",
    aboutDesc:
      "A professional synthesis of skills, philosophy, and pillars of technical practice.",
    aboutLink: "Access About →",
    nowTitle: "Now (/now)",
    nowDesc:
      "Active focuses of study, current intellectual obsessions, and current readings.",
    nowLink: "Access Now →",
    projectsTitle: "Projects",
    projectsDesc:
      "A dynamic listing of public repositories and utilities maintained on GitHub.",
    projectsLink: "Access Projects →",
    nextStepsTitle: "Next Steps (Cultivation Backlog)",
    stepSystems:
      "⚙️ Systems: Add detailed reverse engineering notes on MediaTek-based firmware.",
    stepLogic: "🧠 Logic: Structure the essay on belief market reflexivity.",
    stepLab:
      "🧪 Lab: Publish botanical formulation recipes and mountaineering checklists.",
  },
  pt: {
    title: "Jardim Digital de Lucas Racoci",
    intro:
      "Este espaço está passando por uma reestruturação e migração completa para uma arquitetura estática moderna usando Next.js 16, Tailwind CSS v4 e MDX.",
    warningTitle: "Página Principal em Desenvolvimento / Under Construction",
    warningText:
      "Esta página inicial é um placeholder temporário servindo como prova de conceito para testar o fluxo de integração e publicação contínua (CI/CD) no GitHub Pages. Novas seções e artigos serão plantados e cultivados aqui nos próximos dias.",
    sowingTitle: "Semeando o Jardim",
    sowingText:
      "Embora a home principal esteja em construção, algumas ramificações essenciais já foram estabelecidas e podem ser exploradas no menu superior:",
    aboutTitle: "Sobre",
    aboutDesc:
      "Uma síntese profissional de competências, filosofia e pilares de atuação técnica.",
    aboutLink: "Acessar Sobre →",
    nowTitle: "Agora (/now)",
    nowDesc:
      "Focos de estudo ativos, obsessões intelectuais atuais e leituras correntes.",
    nowLink: "Acessar Agora →",
    projectsTitle: "Projetos",
    projectsDesc:
      "Listagem dinâmica de repositórios públicos e utilitários mantidos no GitHub.",
    projectsLink: "Acessar Projetos →",
    nextStepsTitle: "Próximos Passos (Backlog de Cultivo)",
    stepSystems:
      "⚙️ Sistemas: Adicionar notas detalhadas de engenharia reversa de firmware base MediaTek.",
    stepLogic:
      "🧠 Lógica: Estruturar o ensaio sobre reflexividade de mercado de crenças.",
    stepLab:
      "🧪 Laboratório: Publicar receitas de formulação botânica e checklists de montanhismo.",
  },
};

export default async function Home({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";
  const t = isPt ? dict.pt : dict.en;

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          {t.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed">
          {t.intro}
        </p>
      </div>

      <InteractiveHero lang={lang as "en" | "pt"} />

      <SudokuMiniWidget lang={lang as "en" | "pt"} />

      {/* Alerta de Construção / Desenvolvimento */}
      <div className="p-5 border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-500/5 dark:bg-amber-500/[0.02] rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
          <span className="text-xl">⚠️</span>
          <span>{t.warningTitle}</span>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-serif leading-relaxed">
          {t.warningText}
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t.sowingTitle}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed">
          {t.sowingText}
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0">
          <li className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-xl flex flex-col justify-between m-0">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1">
                {t.aboutTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-serif leading-normal m-0">
                {t.aboutDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/about`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.aboutLink}
            </Link>
          </li>

          <li className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-xl flex flex-col justify-between m-0">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1">
                {t.nowTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-serif leading-normal m-0">
                {t.nowDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/now`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nowLink}
            </Link>
          </li>

          <li className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-xl flex flex-col justify-between m-0">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1">
                {t.projectsTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-serif leading-normal m-0">
                {t.projectsDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/projects`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.projectsLink}
            </Link>
          </li>
        </ul>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          {t.nextStepsTitle}
        </h2>
        <ul className="space-y-2 text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-sm list-disc pl-5">
          <li>
            <strong>{t.stepSystems.split(":")[0]}:</strong>
            {t.stepSystems.split(":")[1]}
          </li>
          <li>
            <strong>{t.stepLogic.split(":")[0]}:</strong>
            {t.stepLogic.split(":")[1]}
          </li>
          <li>
            <strong>{t.stepLab.split(":")[0]}:</strong>
            {t.stepLab.split(":")[1]}
          </li>
        </ul>
      </div>
    </div>
  );
}
