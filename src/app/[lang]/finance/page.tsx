import ProjectCaseStudy from "../../../components/ProjectCaseStudy";

export const metadata = {
  title: "Explorações em Finanças | Jardim Digital",
  description: "Painéis quantitativos, screeners e infraestrutura para análise de mercado financeiro.",
};

export default function FinanceExplorationsPage() {
  return (
    <div className="space-y-16">
      {/* Intro to the Finance Tab */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          📈 Explorações em Finanças
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed">
          Sistemas e ferramentas voltadas para o mercado financeiro, construídas com um viés de engenharia focado em autonomia, performance e redução de infraestrutura.
        </p>
      </div>

      {/* Featured Project */}
      <ProjectCaseStudy />
    </div>
  );
}
