import MatrixTensorEn from "../../../../content/essays/matrix-tensor/en.mdx";
import MatrixTensorPt from "../../../../content/essays/matrix-tensor/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function MatrixTensorPage({ params }: PageProps) {
  const { lang } = await params;
  return (
    <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
      {lang === "pt" ? <MatrixTensorPt /> : <MatrixTensorEn />}
    </article>
  );
}