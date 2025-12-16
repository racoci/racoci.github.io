import NodeGraftViewer from "../../../../components/NodeGraftViewer";
import NodeGraftEn from "../../../../content/nodegraft/en.mdx";
import NodeGraftPt from "../../../../content/nodegraft/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function NodeGraftPage({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3 font-sans">
          {isPt ? "Módulo NodeGraft / PolyGraft 3D" : "NodeGraft Module / PolyGraft 3D"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed mb-6">
          {isPt 
            ? "Módulo WebGPU interativo para modelagem e geração procedural de malhas 3D por meio de SDF (Campos de Distância com Sinal) e Dual Contouring em tempo real."
            : "An interactive, real-time WebGPU module for procedural 3D prop generation via SDF (Signed Distance Fields) and Dual Contouring."}
        </p>
      </div>

      {/* Interactive 3D WebGPU & CPU Fallback Viewer */}
      <NodeGraftViewer />

      {/* Localized Technical Documentation Section */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-12">
        {isPt ? <NodeGraftPt /> : <NodeGraftEn />}
      </div>
    </div>
  );
}
