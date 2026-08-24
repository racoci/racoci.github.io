"use client";

import React, { useState, useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

type Matrix2x2 = [[number, number], [number, number]];

const IDENT: Matrix2x2 = [[1, 0], [0, 1]];
const MAT_L: Matrix2x2 = [[1, 0], [1, 1]];
const MAT_R: Matrix2x2 = [[1, 1], [0, 1]];

function multiply(A: Matrix2x2, B: Matrix2x2): Matrix2x2 {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1],
    ],
  ];
}

export function SternBrocotVisualizer() {
  const [path, setPath] = useState<string>("");
  const [matrix, setMatrix] = useState<Matrix2x2>(IDENT);
  const [target, setTarget] = useState<number>(Math.PI);
  const [autoStepId, setAutoStepId] = useState<any>(null);

  const num = matrix[0][0] + matrix[0][1];
  const den = matrix[1][0] + matrix[1][1];
  const currentVal = num / den;

  const handleStep = (dir: "L" | "R") => {
    setPath((p) => p + dir);
    setMatrix((m) => multiply(m, dir === "L" ? MAT_L : MAT_R));
  };

  const reset = () => {
    setPath("");
    setMatrix(IDENT);
    if (autoStepId) clearInterval(autoStepId);
    setAutoStepId(null);
  };

  const stepTowardsTarget = () => {
    setMatrix((m) => {
      const cNum = m[0][0] + m[0][1];
      const cDen = m[1][0] + m[1][1];
      const cVal = cNum / cDen;
      
      const dir = target < cVal ? "L" : "R";
      setPath((p) => p + dir);
      return multiply(m, dir === "L" ? MAT_L : MAT_R);
    });
  };

  const autoApproximate = () => {
    if (autoStepId) {
      clearInterval(autoStepId);
      setAutoStepId(null);
    } else {
      const id = setInterval(() => {
        stepTowardsTarget();
      }, 500);
      setAutoStepId(id);
    }
  };

  useEffect(() => {
    return () => {
      if (autoStepId) clearInterval(autoStepId);
    };
  }, [autoStepId]);

  const error = Math.abs(target - currentVal);

  return (
    <div className="my-8 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-emerald-400 font-bold text-lg">Stern-Brocot Navigator</h3>
          <p className="text-zinc-400 text-sm">Navigate the infinite binary tree of rational numbers.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="number" 
            step="any"
            value={target}
            onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-1.5 rounded-lg text-sm w-32 focus:outline-none focus:border-emerald-500"
            title="Target Irrational"
          />
          <button 
            onClick={autoApproximate}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${autoStepId ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}
          >
            {autoStepId ? "Stop" : "Auto-Seek"}
          </button>
          <button 
            onClick={reset}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-bold transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">Current Transformation Matrix</div>
          <div className="text-2xl overflow-x-auto max-w-full scrollbar-none">
            <BlockMath math={`\\begin{pmatrix} ${matrix[0][0]} & ${matrix[0][1]} \\\\ ${matrix[1][0]} & ${matrix[1][1]} \\end{pmatrix}`} />
          </div>
          <div className="mt-4 text-xs font-mono text-zinc-400 text-center break-all">
            Path: <span className="text-emerald-400">{path || "Root"}</span>
          </div>
          <div className="flex gap-4 mt-6">
            <button onClick={() => handleStep("L")} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full font-bold shadow-lg transition-transform hover:-translate-y-1">L</button>
            <button onClick={() => handleStep("R")} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full font-bold shadow-lg transition-transform hover:-translate-y-1">R</button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5" style={{ opacity: Math.max(0, 1 - error * 10) }}></div>
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4 z-10">Rational Mediant Approximation</div>
          <div className="text-3xl z-10 overflow-x-auto max-w-full scrollbar-none">
            <BlockMath math={`\\frac{${matrix[0][0]} + ${matrix[0][1]}}{${matrix[1][0]} + ${matrix[1][1]}} = \\frac{${num}}{${den}}`} />
          </div>
          <div className="text-4xl font-mono text-zinc-100 font-bold mt-4 z-10">
            {currentVal.toFixed(6)}
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-2 z-10">
            Error: <span className={error < 0.0001 ? "text-emerald-400" : "text-rose-400"}>{error.toExponential(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}