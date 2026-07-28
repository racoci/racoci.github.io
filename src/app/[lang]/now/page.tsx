import NowEn from "../../../content/now/en.mdx";
import NowPt from "../../../content/now/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function NowPage({ params }: PageProps) {
  const { lang } = await params;
  return lang === "pt" ? <NowPt /> : <NowEn />;
}
