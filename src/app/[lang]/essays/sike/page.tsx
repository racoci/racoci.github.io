import SikeEn from "../../../../content/essays/sike/en.mdx";
import SikePt from "../../../../content/essays/sike/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function SikePage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
      {lang === "pt" ? <SikePt /> : <SikeEn />}
    </article>
  );
}
