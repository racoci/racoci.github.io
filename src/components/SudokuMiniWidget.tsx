"use client";

import React, { useState } from "react";
import Link from "next/link";

interface SudokuMiniWidgetProps {
  lang: "en" | "pt";
}

export default function SudokuMiniWidget({ lang }: SudokuMiniWidgetProps) {
  const isPt = lang === "pt";

  const t = {
    en: {
      badge: "Interactive Mini-Widget",
      title: "Sudoku Constraint Playground",
      desc: "An interactive, micro-scale 4x4 Sudoku grid. Click any empty cell to cycle values (1 to 4) or hover a number to trigger real-time, equidistant HSL constraint highlights.",
      btn: "Launch Full Sudoku Mentor",
      launchLabel: "Explore advanced constraint propagation and step-by-step logic.",
    },
    pt: {
      badge: "Mini-Widget Interativo",
      title: "Playground de Restrições Sudoku",
      desc: "Uma grade interativa micro-escala de Sudoku 4x4. Clique em qualquer célula vazia para alternar valores (1 a 4) ou passe o mouse para acionar destaques HSL de restrições em tempo real.",
      btn: "Abrir Mentor de Sudoku",
      launchLabel: "Explore propagação avançada de restrições e lógicas passo a passo.",
    },
  }[lang];

  // A 4x4 Sudoku setup
  // 0 represents empty/user editable cells
  const initialGivens = [
    1, 0, 3, 0,
    0, 4, 0, 2,
    0, 1, 4, 0,
    4, 0, 0, 1
  ];

  const solution = [
    1, 2, 3, 4,
    3, 4, 1, 2,
    2, 1, 4, 3,
    4, 3, 2, 1
  ];

  const [board, setBoard] = useState<number[]>(initialGivens);
  const [hoveredNum, setHoveredNum] = useState<number | null>(null);

  // Click handler to cycle user cells: 0 -> 1 -> 2 -> 3 -> 4 -> 0
  const handleCellClick = (idx: number) => {
    if (initialGivens[idx] !== 0) return; // cannot edit initial clues

    setBoard((prev) => {
      const next = [...prev];
      next[idx] = (next[idx] + 1) % 5; // cycles 0, 1, 2, 3, 4
      return next;
    });
  };

  // Equidistant HSL Hue logic matching main viewer
  const getHSLColor = (num: number) => {
    const hue = (num - 1) * 90; // Equidistant hues for 1..4 (0, 90, 180, 270)
    return `hsl(${hue}, 75%, 45%)`;
  };

  const getHSLBgs = (num: number) => {
    const hue = (num - 1) * 90;
    return `hsla(${hue}, 75%, 45%, 0.12)`;
  };

  return (
    <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/10 shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-8 min-h-[250px] transition-all select-none">
      
      {/* Description Overlay Content */}
      <div className="space-y-4 flex-1 z-10 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/15">
            {t.badge}
          </span>
          {board.every((val, i) => val === solution[i] || val === 0) && !board.includes(0) && (
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
              🎉 SOLVED!
            </span>
          )}
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
          {t.title}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-sm max-w-xl">
          {t.desc}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
          <Link
            href={`/${lang}/projects/sudoku`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-950 font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm group"
          >
            <span>{t.btn}</span>
            <svg
              className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-serif max-w-[200px] leading-normal italic">
            {t.launchLabel}
          </span>
        </div>
      </div>

      {/* Interactive 4x4 Grid Canvas / Widget */}
      <div className="relative flex items-center justify-center w-[180px] h-[180px] bg-zinc-50 dark:bg-zinc-950/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 shrink-0 shadow-inner z-10">
        <div className="grid grid-cols-4 grid-rows-4 h-full w-full gap-0.5 bg-zinc-200 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-900">
          {board.map((val, idx) => {
            const isGiven = initialGivens[idx] !== 0;
            const r = Math.floor(idx / 4);
            const c = idx % 4;

            // Thick line borders between 2x2 boxes
            const borderTop = r === 2 ? "border-t-2 border-t-zinc-700 dark:border-t-zinc-400" : "";
            const borderLeft = c === 2 ? "border-l-2 border-l-zinc-700 dark:border-l-zinc-400" : "";

            const isMatchHover = val !== 0 && hoveredNum === val;

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(idx)}
                onMouseEnter={() => {
                  if (val !== 0) setHoveredNum(val);
                }}
                onMouseLeave={() => setHoveredNum(null)}
                style={{
                  color: val !== 0 ? getHSLColor(val) : undefined,
                  backgroundColor: isMatchHover ? getHSLBgs(val) : undefined,
                }}
                className={`relative flex items-center justify-center cursor-pointer transition-all aspect-square text-sm font-sans ${borderTop} ${borderLeft} ${
                  isGiven
                    ? "bg-zinc-100/80 dark:bg-zinc-900/60 font-extrabold"
                    : "bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 text-zinc-600 dark:text-zinc-400"
                } ${isMatchHover ? "scale-105 z-10 shadow-sm" : ""}`}
              >
                {val !== 0 ? val : ""}

                {/* Sub-dot indicator for incorrect matches */}
                {val !== 0 && !isGiven && val !== solution[idx] && (
                  <div className="absolute bottom-1 h-1 w-1 rounded-full bg-red-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
