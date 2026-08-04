import SystemsEn from "../../../content/systems/en.mdx";
import SystemsPt from "../../../content/systems/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function SystemsPage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto">
      {lang === "pt" ? <SystemsPt /> : <SystemsEn />}
    </article>
  );
}
