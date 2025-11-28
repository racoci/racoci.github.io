import AboutEn from "../../../content/about/en.mdx";
import AboutPt from "../../../content/about/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function AboutPage({ params }: PageProps) {
  const { lang } = await params;
  return lang === "pt" ? <AboutPt /> : <AboutEn />;
}
