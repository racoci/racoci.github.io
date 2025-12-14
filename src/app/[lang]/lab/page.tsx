import LabEn from "../../../content/lab/en.mdx";
import LabPt from "../../../content/lab/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function LabPage({ params }: PageProps) {
  const { lang } = await params;
  return lang === "pt" ? <LabPt /> : <LabEn />;
}
