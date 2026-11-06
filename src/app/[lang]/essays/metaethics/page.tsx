import MetaethicsEn from "../../../../content/essays/metaethics/en.mdx";
import MetaethicsPt from "../../../../content/essays/metaethics/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function MetaethicsPage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
      {lang === "pt" ? <MetaethicsPt /> : <MetaethicsEn />}
    </article>
  );
}
