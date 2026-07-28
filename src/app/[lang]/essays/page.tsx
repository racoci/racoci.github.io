import EssaysEn from "../../../content/essays/en.mdx";
import EssaysPt from "../../../content/essays/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function EssaysPage({ params }: PageProps) {
  const { lang } = await params;
  return lang === "pt" ? <EssaysPt /> : <EssaysEn />;
}
