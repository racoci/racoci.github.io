"use client";

import React, { useState, useEffect } from "react";

export default function SIDHDiagramVisualizer() {
  const [step, setStep] = useState(0); // 0: Init, 1: Public Keys, 2: Shared Secret, 3: Complete
  const [animating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (step === 1) {
      setIsAnimating(true);
      const timer = setTimeout(() => setStep(2), 3500);
      return () => clearTimeout(timer);
    } else if (step === 2) {
      setIsAnimating(true);
      const timer = setTimeout(() => setStep(3), 3500);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [step]);

  const reset = () => {
    setStep(0);
    setIsAnimating(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-xl mx-auto shadow-2xl">
      <style jsx>{`
        @keyframes flow-left {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes flow-right {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-emerald {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.4)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.8)); }
        }
        @keyframes particle-flow-l1 {
          0% { cx: 200; cy: 40; opacity: 1; }
          100% { cx: 100; cy: 120; opacity: 1; }
        }
        @keyframes particle-flow-r1 {
          0% { cx: 200; cy: 40; opacity: 1; }
          100% { cx: 300; cy: 120; opacity: 1; }
        }
        @keyframes particle-flow-l2 {
          0% { cx: 100; cy: 120; opacity: 1; }
          100% { cx: 200; cy: 200; opacity: 1; }
        }
        @keyframes particle-flow-r2 {
          0% { cx: 300; cy: 120; opacity: 1; }
          100% { cx: 200; cy: 200; opacity: 1; }
        }
        .flow-line {
          stroke-dasharray: 8, 4;
          animation: flow-left 3s linear infinite;
        }
        .node-pulse-shared {
          animation: pulse-emerald 2s infinite ease-in-out;
        }
      `}</style>

      <div className="text-center mb-4">
        <h4 className="text-lg font-bold text-zinc-100 tracking-tight font-sans">
          Troca de Chaves SIDH (Diagrama Comutativo)
        </h4>
        <p className="text-xs text-zinc-400 font-serif mt-1">
          A convergência de caminhos de isogenia para a mesma curva supersingular
        </p>
      </div>

      <div className="relative w-full aspect-[4/3] bg-zinc-900/40 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner flex items-center justify-center">
        <svg className="w-full h-full max-h-[260px]" viewBox="0 0 400 240">
          <defs>
            <filter id="glow-node" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Paths / Connections */}
          {/* Top to Left (Alice step 1) */}
          <path
            d="M 200 40 L 100 120"
            stroke={step >= 1 ? "#f43f5e" : "#27272a"}
            strokeWidth="2.5"
            fill="none"
            className={step === 1 ? "flow-line" : ""}
            opacity={step >= 1 ? 1 : 0.3}
          />
          {/* Top to Right (Bob step 1) */}
          <path
            d="M 200 40 L 300 120"
            stroke={step >= 1 ? "#3b82f6" : "#27272a"}
            strokeWidth="2.5"
            fill="none"
            className={step === 1 ? "flow-line" : ""}
            opacity={step >= 1 ? 1 : 0.3}
          />
          {/* Left to Bottom (Bob step 2) */}
          <path
            d="M 100 120 L 200 200"
            stroke={step >= 2 ? "#3b82f6" : "#27272a"}
            strokeWidth="2.5"
            fill="none"
            className={step === 2 ? "flow-line" : ""}
            opacity={step >= 2 ? 1 : 0.3}
          />
          {/* Right to Bottom (Alice step 2) */}
          <path
            d="M 300 120 L 200 200"
            stroke={step >= 2 ? "#f43f5e" : "#27272a"}
            strokeWidth="2.5"
            fill="none"
            className={step === 2 ? "flow-line" : ""}
            opacity={step >= 2 ? 1 : 0.3}
          />

          {/* Flowing Particles */}
          {step === 1 && (
            <>
              {/* Alice particle */}
              <circle r="5" fill="#f43f5e" filter="url(#glow-node)" style={{ animation: "particle-flow-l1 3.5s infinite linear" }} />
              {/* Bob particle */}
              <circle r="5" fill="#3b82f6" filter="url(#glow-node)" style={{ animation: "particle-flow-r1 3.5s infinite linear" }} />
            </>
          )}
          {step === 2 && (
            <>
              {/* Alice path 2 (Bob's curve to bottom) */}
              <circle r="5" fill="#f43f5e" filter="url(#glow-node)" style={{ animation: "particle-flow-r2 3.5s infinite linear" }} />
              {/* Bob path 2 (Alice's curve to bottom) */}
              <circle r="5" fill="#3b82f6" filter="url(#glow-node)" style={{ animation: "particle-flow-l2 3.5s infinite linear" }} />
            </>
          )}

          {/* NODES */}
          {/* Top Node: E */}
          <g transform="translate(200, 40)">
            <circle r="18" fill="#18181b" stroke="#71717a" strokeWidth="2.5" />
            <text dy="4" textAnchor="middle" fill="#f4f4f5" className="text-[11px] font-bold font-sans">E</text>
          </g>

          {/* Left Node: E/A (Alice) */}
          <g transform="translate(100, 120)" opacity={step >= 1 ? 1 : 0.4}>
            <circle r="20" fill="#18181b" stroke="#f43f5e" strokeWidth="2.5" filter={step >= 1 ? "url(#glow-node)" : ""} />
            <text dy="4" textAnchor="middle" fill="#f43f5e" className="text-[10px] font-bold font-sans">E/⟨A⟩</text>
          </g>

          {/* Right Node: E/B (Bob) */}
          <g transform="translate(300, 120)" opacity={step >= 1 ? 1 : 0.4}>
            <circle r="20" fill="#18181b" stroke="#3b82f6" strokeWidth="2.5" filter={step >= 1 ? "url(#glow-node)" : ""} />
            <text dy="4" textAnchor="middle" fill="#3b82f6" className="text-[10px] font-bold font-sans">E/⟨B⟩</text>
          </g>

          {/* Bottom Node: E/<A,B> (Shared Key) */}
          <g
            transform="translate(200, 200)"
            opacity={step >= 3 ? 1 : 0.4}
            className={step === 3 ? "node-pulse-shared" : ""}
          >
            <circle r="22" fill="#18181b" stroke="#10b981" strokeWidth="3" filter={step >= 3 ? "url(#glow-node)" : ""} />
            <text dy="4" textAnchor="middle" fill="#10b981" className="text-[9px] font-bold font-sans">E/⟨A,B⟩</text>
          </g>

          {/* Text Labels on Arrows */}
          <g className="text-[9px] font-mono font-bold fill-zinc-500">
            <text x="130" y="70" rotate="-38">ϕ_A</text>
            <text x="250" y="70" rotate="38">ϕ_B</text>
            <text x="130" y="180" rotate="38">ϕ'_B</text>
            <text x="250" y="180" rotate="-38">ϕ'_A</text>
          </g>
        </svg>

        {/* Float Labels for Alice and Bob */}
        <div className="absolute top-24 left-4 text-left">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest font-sans">Alice</span>
          <p className="text-[9px] text-zinc-500 font-serif leading-none">Gera chave pública E/⟨A⟩</p>
        </div>
        <div className="absolute top-24 right-4 text-right">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest font-sans">Bob</span>
          <p className="text-[9px] text-zinc-500 font-serif leading-none">Gera chave pública E/⟨B⟩</p>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="w-full mt-6 flex flex-col items-center">
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className="px-6 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 font-semibold rounded-xl text-xs tracking-wider uppercase font-sans transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Iniciar Simulação de Troca de Chaves
          </button>
        )}
        {(step === 1 || step === 2) && (
          <div className="flex items-center space-x-2 text-zinc-400 font-mono text-xs">
            <div className="animate-spin h-3.5 w-3.5 border-2 border-zinc-500 border-t-transparent rounded-full" />
            <span>
              {step === 1
                ? "Etapa 1: Alice e Bob mapeiam a curva original E..."
                : "Etapa 2: Calculando caminhos cruzados de isogenias..."}
            </span>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col items-center space-y-3">
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-mono text-[10px] uppercase font-bold tracking-widest animate-pulse">
              Chave Compartilhada Estabelecida
            </div>
            <button
              onClick={reset}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-300 font-medium rounded-xl text-xs font-sans transition-colors duration-200"
            >
              Reiniciar
            </button>
          </div>
        )}
      </div>

      {/* Meta Text */}
      <div className="w-full mt-4 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
        <p className="text-[11px] text-zinc-400 font-serif leading-relaxed">
          {step === 0 ? (
            <span>Clique no botão para ver como o segredo compartilhado é construído através de caminhos comutativos de isogenias.</span>
          ) : step === 1 ? (
            <span>Alice caminha pelo núcleo <span className="text-rose-400">$\phi_A$</span> e Bob caminha por <span className="text-blue-400">$\phi_B$</span> para revelar suas curvas publicamente.</span>
          ) : step === 2 ? (
            <span>Alice usa a curva de Bob e seu segredo para calcular <span className="text-rose-400">$\phi'_A$</span>. Bob faz o mesmo para <span className="text-blue-400">$\phi'_B$</span>.</span>
          ) : (
            <span>Ambos convergem exatamente para o mesmo isomorfismo de curva supersingular no final!</span>
          )}
        </p>
      </div>
    </div>
  );
}
