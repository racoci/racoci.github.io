import HoldsKernelWidget from "../../../../components/HoldsKernelWidget";
import HoldsEn from "../../../../content/holds/en.mdx";
import HoldsPt from "../../../../content/holds/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function HoldsPage({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";

  return (
    <div className="space-y-8 w-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3 font-sans">
          {isPt ? "Holds Substrate: Compilador & Kernel Físico" : "Holds Substrate: Compiler & Physical Kernel"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed mb-6">
          {isPt 
            ? "Módulo concorrente de simulação de restrições rígidas compilado em Rust WebAssembly e isolado dentro de threads Web Workers dedicadas."
            : "A concurrent rigid-body constraint simulation kernel compiled into Rust WebAssembly and isolated inside dedicated Web Worker threads."}
        </p>
      </div>

      {/* Embedded Svelte UI Sandbox Viewport */}
      <div className="max-w-5xl mx-auto w-full">
        <HoldsKernelWidget />
      </div>

      {/* Localized Technical Documentation Section */}
      <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
        {isPt ? <HoldsPt /> : <HoldsEn />}
      </article>
    </div>
  );
}
