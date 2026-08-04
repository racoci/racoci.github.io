import AboutEn from "../../../content/about/en.mdx";
import AboutPt from "../../../content/about/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function AboutPage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto">
      {lang === "pt" ? <AboutPt /> : <AboutEn />}
    </article>
  );
}
