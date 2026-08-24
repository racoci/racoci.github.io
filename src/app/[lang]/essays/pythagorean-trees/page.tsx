import PythagoreanTreesEn from "../../../../content/essays/pythagorean-trees/en.mdx";
import PythagoreanTreesPt from "../../../../content/essays/pythagorean-trees/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function PythagoreanTreesPage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto">
      {lang === "pt" ? <PythagoreanTreesPt /> : <PythagoreanTreesEn />}
    </article>
  );
}