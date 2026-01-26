import SudokuViewer from "../../../../components/SudokuViewer";
import SudokuEn from "../../../../content/sudoku/en.mdx";
import SudokuPt from "../../../../content/sudoku/pt.mdx";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function SudokuPage({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";

  return (
    <div className="space-y-8 w-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3 font-sans">
          {isPt ? "Módulo Sudoku Mentor" : "Sudoku Mentor Module"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed mb-6">
          {isPt
            ? "Um assistente inteligente de Sudoku executado totalmente no navegador. Aprenda a resolver tabuleiros por meio de teorias de podas algébricas e propagação de restrições em tempo real."
            : "An intelligent client-side Sudoku instructor. Learn to solve puzzles through topological constraint propagation, algebraic pruning explanations, and real-time backtracking."}
        </p>
      </div>

      {/* Main Interactive Sudoku Game Board */}
      <SudokuViewer lang={lang as "en" | "pt"} />

      {/* Localized Technical Documentation Section */}
      <article className="prose dark:prose-invert prose-emerald max-w-4xl mx-auto mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
        {isPt ? <SudokuPt /> : <SudokuEn />}
      </article>
    </div>
  );
}
