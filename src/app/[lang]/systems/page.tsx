import SystemsEn from "../../../content/systems/en.mdx";
import SystemsPt from "../../../content/systems/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function SystemsPage({ params }: PageProps) {
  const { lang } = await params;
  return lang === "pt" ? <SystemsPt /> : <SystemsEn />;
}
