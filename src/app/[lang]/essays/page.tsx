import EssaysEn from "../../../content/essays/en.mdx";
import EssaysPt from "../../../content/essays/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function EssaysPage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto">
      {lang === "pt" ? <EssaysPt /> : <EssaysEn />}
    </article>
  );
}
