"use client";

import React, { useState } from "react";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

type Triple = [number, number, number];
type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

const MAT_U: Matrix3x3 = [
  [1, -2, 2],
  [2, -1, 2],
  [2, -2, 3],
];

const MAT_A: Matrix3x3 = [
  [1, 2, 2],
  [2, 1, 2],
  [2, 2, 3],
];

const MAT_D: Matrix3x3 = [
  [-1, 2, 2],
  [-2, 1, 2],
  [-2, 2, 3],
];

function multiply(M: Matrix3x3, v: Triple): Triple {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}

export function BarningHallTreeVisualizer() {
  const [triple, setTriple] = useState<Triple>([3, 4, 5]);
  const [path, setPath] = useState<string>("");

  const handleStep = (mat: Matrix3x3, label: string) => {
    setTriple((t) => multiply(mat, t));
    setPath((p) => (p ? `${p} \\to ${label}` : label));
  };

  const reset = () => {
    setTriple([3, 4, 5]);
    setPath("");
  };

  return (
    <div className="my-8 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-emerald-400 font-bold text-lg">Barning-Hall Tree</h3>
          <p className="text-zinc-400 text-sm">Navigate the infinite ternary tree of primitive Pythagorean triples using 3D orthogonal matrices.</p>
        </div>
        <button 
          onClick={reset}
          className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-bold transition-colors"
        >
          Reset to Root
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">Current Triple</div>
        
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="text-3xl overflow-x-auto max-w-full scrollbar-none text-center">
            <BlockMath math={`\\begin{pmatrix} a \\\\ b \\\\ c \\end{pmatrix} = \\begin{pmatrix} \\textcolor{#10b981}{${triple[0]}} \\\\ \\textcolor{#3b82f6}{${triple[1]}} \\\\ \\textcolor{#f43f5e}{${triple[2]}} \\end{pmatrix}`} />
          </div>

          <div className="text-lg font-mono text-zinc-300 mt-2">
            <BlockMath math={`\\textcolor{#10b981}{${triple[0]}}^2 + \\textcolor{#3b82f6}{${triple[1]}}^2 = \\textcolor{#f43f5e}{${triple[2]}}^2`} />
          </div>
          
          <div className="text-xs font-mono text-zinc-400 text-center break-all mb-4">
            Path: <span className="text-emerald-400">{path || "Root (3, 4, 5)"}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
            <button 
              onClick={() => handleStep(MAT_U, "U")} 
              className="flex flex-col items-center p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50 transition-all hover:-translate-y-1 group"
            >
              <span className="font-bold text-lg text-purple-400 mb-2">Matrix U (Up)</span>
              <div className="opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none scale-75 origin-top">
                <BlockMath math={`\\begin{pmatrix} 1 & -2 & 2 \\\\ 2 & -1 & 2 \\\\ 2 & -2 & 3 \\end{pmatrix}`} />
              </div>
            </button>

            <button 
              onClick={() => handleStep(MAT_A, "A")} 
              className="flex flex-col items-center p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50 transition-all hover:-translate-y-1 group"
            >
              <span className="font-bold text-lg text-purple-400 mb-2">Matrix A (Adjacent)</span>
              <div className="opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none scale-75 origin-top">
                <BlockMath math={`\\begin{pmatrix} 1 & 2 & 2 \\\\ 2 & 1 & 2 \\\\ 2 & 2 & 3 \\end{pmatrix}`} />
              </div>
            </button>

            <button 
              onClick={() => handleStep(MAT_D, "D")} 
              className="flex flex-col items-center p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50 transition-all hover:-translate-y-1 group"
            >
              <span className="font-bold text-lg text-purple-400 mb-2">Matrix D (Down)</span>
              <div className="opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none scale-75 origin-top">
                <BlockMath math={`\\begin{pmatrix} -1 & 2 & 2 \\\\ -2 & 1 & 2 \\\\ -2 & 2 & 3 \\end{pmatrix}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}