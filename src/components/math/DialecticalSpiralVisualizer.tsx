"use client";

import React, { useRef, useEffect, useState } from "react";
import { InlineMath, BlockMath } from "react-katex";

type LogicRegime = "classical" | "paraconsistent" | "categorical";

interface OrdinalStage {
  label: string;
  math: string;
  hegelConcept: string;
  thesis: string;
  antithesis: string;
  synthesis: string;
  leanSnippet: string;
}

const STAGES: OrdinalStage[] = [
  {
    label: "Stage 0: Immediate Being",
    math: "0 = \\emptyset",
    hegelConcept: "Pure Being & Pure Nothing (Reines Sein / Nichts)",
    thesis: "Being (Sein)",
    antithesis: "Nothing (Nichts)",
    synthesis: "Becoming (Werden)",
    leanSnippet: "-- Immediate indeterminate origin\ndef Being : Prop := True\ndef Nothing : Prop := False",
  },
  {
    label: "Stage 1: Finite Determination",
    math: "1 = \\{0\\}",
    hegelConcept: "Determinate Being (Dasein / Something & Other)",
    thesis: "Something (Etwas)",
    antithesis: "Other (Anderes)",
    synthesis: "Being-for-self (Fürsichsein)",
    leanSnippet: "-- Finite determination as successor\ninductive Dasein : Type where\n| something : Dasein\n| other : Dasein",
  },
  {
    label: "Stage 2: Spurious Progression",
    math: "n + 1 = n \\cup \\{n\\}",
    hegelConcept: "The Spurious Infinity (Schlechte Unendlichkeit)",
    thesis: "Finite Boundary",
    antithesis: "Transgression (+1)",
    synthesis: "Endless Iteration (n -> n+1)",
    leanSnippet: "-- Successor iteration: endless progression without qualitative leap\ndef next (n : Nat) : Nat := n + 1",
  },
  {
    label: "Stage 3: The True Infinity",
    math: "\\omega = \\bigcup_{n < \\omega} n",
    hegelConcept: "True Infinity (Wahrhafte Unendlichkeit / Aufhebung)",
    thesis: "All Finite Successors",
    antithesis: "Inability of any n to reach infinity",
    synthesis: "Limit Ordinal ω (Sublation of the finite series)",
    leanSnippet: "-- First limit ordinal: sublation of all finite numbers\ndef Omega : Ordinal := Ordinal.omega0",
  },
  {
    label: "Stage 4: Higher-Order Iteration",
    math: "\\omega^2 = \\sup_{k < \\omega} (\\omega \\cdot k)",
    hegelConcept: "Mediation of Mediations (Essence & Reflection)",
    thesis: "Linear sequence of limit tiers",
    antithesis: "Transfinite gap between tiers",
    synthesis: "Polynomial ordinal plane",
    leanSnippet: "-- Transfinite multiplication as iterated reflection\ndef OmegaSq : Ordinal := Omega * Omega",
  },
  {
    label: "Stage 5: Self-Similar Closure",
    math: "\\omega^\\omega = \\sup_{n < \\omega} \\omega^n",
    hegelConcept: "The Concept / Notion (Der Begriff)",
    thesis: "Exponential expansion of tiers",
    antithesis: "Boundlessness of power hierarchies",
    synthesis: "Autonomous Cantor Normal Form",
    leanSnippet: "-- Exponential ordinal limit: the concept generating its own universe\ndef OmegaPowOmega : Ordinal := Ordinal.opow Omega Omega",
  },
  {
    label: "Stage 6: The Absolute Idea",
    math: "\\varepsilon_0 = \\omega^{\\varepsilon_0} = \\sup \\{ \\omega, \\omega^\\omega, \\dots \\}",
    hegelConcept: "The Absolute Idea (Self-grounding Fixed Point)",
    thesis: "Hierarchy of ordinal exponentiation",
    antithesis: "External transcendence requirement",
    synthesis: "Fixed point: ε₀ = ω^(ε₀) (Self-containing closure)",
    leanSnippet: "-- Fixed point: sublation completes itself where alpha = omega^alpha\ndef EpsilonZero : Ordinal := Ordinal.epsilon0",
  },
];

export function DialecticalSpiralVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeStageIdx, setActiveStageIdx] = useState(3);
  const [regime, setRegime] = useState<LogicRegime>("paraconsistent");
  const [isRotating, setIsRotating] = useState(true);
  const angleRef = useRef(0);

  const activeStage = STAGES[activeStageIdx];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      if (isRotating) {
        angleRef.current += 0.015;
      }

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // Background subtle grid
      ctx.strokeStyle = "rgba(39, 39, 42, 0.4)";
      ctx.lineWidth = 1;
      for (let r = 30; r < W / 2; r += 30) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Check for classical explosion
      if (regime === "classical" && activeStageIdx >= 1) {
        // Classical Explosion Animation
        ctx.save();
        ctx.fillStyle = "rgba(244, 63, 94, 0.1)";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, 60 + Math.sin(angleRef.current * 3) * 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Disjointed fragments
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + angleRef.current;
          const rad = 80 + (i % 2) * 30;
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center explosion mark
        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("COLLAPSE (⊥)", cx, cy - 10);
        ctx.font = "10px monospace";
        ctx.fillStyle = "#fda4af";
        ctx.fillText("Ex Falso Quodlibet", cx, cy + 12);
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // Draw Dialectical Spiral
      ctx.save();
      ctx.lineWidth = 2;
      const spiralPoints: { x: number; y: number }[] = [];
      const totalTurns = 4 + activeStageIdx * 0.8;
      const maxRadius = Math.min(cx, cy) - 25;

      for (let t = 0; t <= totalTurns * Math.PI * 2; t += 0.05) {
        const progress = t / (totalTurns * Math.PI * 2);
        const r = progress * maxRadius;
        const currentAng = t + angleRef.current;
        const px = cx + Math.cos(currentAng) * r;
        const py = cy + Math.sin(currentAng) * r;
        spiralPoints.push({ x: px, y: py });
      }

      // Draw spiral path
      ctx.beginPath();
      spiralPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#fbbf24"); // Amber
      grad.addColorStop(0.5, "#a855f7"); // Purple
      grad.addColorStop(1, "#10b981"); // Emerald
      ctx.strokeStyle = grad;
      ctx.stroke();

      // Draw Triad Vectors at active stage
      const curAng = angleRef.current;
      const tierRadius = 35 + activeStageIdx * 16;

      // Thesis (Gold / Amber)
      const tX = cx + Math.cos(curAng) * tierRadius;
      const tY = cy + Math.sin(curAng) * tierRadius;
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tX, tY);
      ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(tX, tY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Antithesis (Rose / Red) - Opposing Vector
      const aAng = curAng + Math.PI * 0.75;
      const aX = cx + Math.cos(aAng) * (tierRadius * 0.9);
      const aY = cy + Math.sin(aAng) * (tierRadius * 0.9);
      ctx.strokeStyle = "#f43f5e";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(aX, aY);
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(aX, aY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Synthesis / Aufhebung (Emerald) - Elevated Sublation Vector
      const sAng = (curAng + aAng) / 2 + (regime === "categorical" ? Math.PI : 0);
      const sRadius = tierRadius * 1.35;
      const sX = cx + Math.cos(sAng) * sRadius;
      const sY = cy + Math.sin(sAng) * sRadius;
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sX, sY);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(sX, sY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Labels on nodes
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("Thesis", tX + 6, tY);
      ctx.fillStyle = "#f43f5e";
      ctx.fillText("Antithesis", aX + 6, aY);
      ctx.fillStyle = "#10b981";
      ctx.fillText("Aufhebung", sX + 6, sY);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [activeStageIdx, regime, isRotating]);

  return (
    <div className="my-8 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl font-sans">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Visualizer Canvas */}
        <div className="relative flex flex-col items-center justify-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="rounded-lg border border-zinc-800 bg-[#09090b]"
          />
          <div className="flex items-center justify-between w-full mt-3 px-1 text-[10px] font-mono text-zinc-500">
            <span>ORDINAL TIER: {activeStage.math}</span>
            <button
              onClick={() => setIsRotating(!isRotating)}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              {isRotating ? "Pausar Rotação" : "Girar Espiral"}
            </button>
          </div>
        </div>

        {/* Control and Theoretical Readout Panel */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400">
                Modelo Dialético em Lean 4
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {activeStageIdx + 1} / {STAGES.length}
              </span>
            </div>
            <h3 className="text-zinc-100 font-bold text-lg mt-1">
              {activeStage.label}
            </h3>
            <p className="text-xs text-zinc-400 font-serif mt-1 italic">
              Conceito Hegeliano: {activeStage.hegelConcept}
            </p>
          </div>

          {/* Logic Regime Toggle */}
          <div className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800/50 space-y-2 text-xs font-mono">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">
              Regime Lógico de Contradição
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                onClick={() => setRegime("classical")}
                className={`py-1.5 px-2 rounded text-[11px] font-medium border text-left transition-colors ${
                  regime === "classical"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 border-transparent text-zinc-400"
                }`}
              >
                1. Clássico (Explosão)
              </button>
              <button
                onClick={() => setRegime("paraconsistent")}
                className={`py-1.5 px-2 rounded text-[11px] font-medium border text-left transition-colors ${
                  regime === "paraconsistent"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 border-transparent text-zinc-400"
                }`}
              >
                2. Paraconsistente (FOUR)
              </button>
              <button
                onClick={() => setRegime("categorical")}
                className={`py-1.5 px-2 rounded text-[11px] font-medium border text-left transition-colors ${
                  regime === "categorical"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : "bg-zinc-900/60 hover:bg-zinc-800 border-transparent text-zinc-400"
                }`}
              >
                3. Ponto Fixo (Adjunção)
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-serif leading-normal mt-1">
              {regime === "classical"
                ? "Em lógica clássica (ou intuicionista pura), A ∧ ¬A implica qualquer proposição (Ex Falso Quodlibet), colapsando a espiral em trivialidade (⊥)."
                : regime === "paraconsistent"
                ? "Na lógica paraconsistente (Belnap-Dunn / Priest LP), contradições habitam o valor 'Both' sem explodir o sistema, permitindo a elevação ordinal (Aufhebung)."
                : "Na semântica categorial de Lawvere, a Aufhebung é formalizada como um operador de fecho ou par de adjunções gerando pontos fixos estáveis."}
            </p>
          </div>

          {/* Stepper / Slider */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase font-bold mb-1">
              <span>Progressão Ordinal Transfinita</span>
              <span className="text-emerald-400">{activeStage.math}</span>
            </div>
            <input
              type="range"
              min="0"
              max={STAGES.length - 1}
              value={activeStageIdx}
              onChange={(e) => setActiveStageIdx(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Lean Code Preview Box */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-3 font-mono text-[10px] text-zinc-300 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1 border-b border-zinc-800/80 pb-1">
              Modelagem Analítica em Lean 4
            </div>
            <pre className="text-emerald-400 leading-relaxed m-0 whitespace-pre">
              {activeStage.leanSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
export default DialecticalSpiralVisualizer;
