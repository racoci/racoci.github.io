import B3Screener from "../../../components/B3Screener";
import FinanceEn from "../../../content/finance/en.mdx";
import FinancePt from "../../../content/finance/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export const metadata = {
  title: "Quantitative Finance | Digital Garden",
  description: "High-performance quantitative panels, screeners, and zero-infra systems for financial market analysis.",
};

export default async function FinanceExplorationsPage({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";

  return (
    <div className="space-y-16">
      {/* Intro to the Finance Tab */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          {isPt ? "📈 Finanças Quantitativas" : "📈 Quantitative Finance"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed">
          {isPt
            ? "Sistemas e ferramentas voltados para o mercado financeiro, construídos com foco em autonomia, alta performance e arquiteturas estáticas com custo operacional zero."
            : "Systems and tools for the financial market, engineered with a focus on high-performance client-side processing, and zero operational cost."}
        </p>
      </div>

      {/* Interactive Component */}
      <B3Screener lang={lang as "en" | "pt"} />

      {/* Localized MDX Documentation */}
      <div className="prose dark:prose-invert max-w-none border-t border-zinc-200 dark:border-zinc-800 pt-10">
        {isPt ? <FinancePt /> : <FinanceEn />}
      </div>
    </div>
  );
}
