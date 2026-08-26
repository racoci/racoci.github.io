"use client";

import React, { useState } from "react";

export default function Genus2RadarVisualizer() {
  const [checking, setChecking] = useState(false);
  const [deltaValue, setDeltaValue] = useState<string>("\\text{Calculando...}");
  const [hasSplit, setHasSplit] = useState(false);

  // Generate Lemniscate (Infinity symbol) path
  const points: string[] = [];
  const a = 110;
  for (let t = 0; t <= Math.PI * 2 + 0.1; t += 0.05) {
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    const denom = 1 + sinT * sinT;
    const x = (a * cosT) / denom;
    const y = (a * sinT * cosT) / denom;
    points.push(`${200 + x},${90 - y}`);
  }
  const lemniscateD = `M ${points.join(" L ")}`;

  const handleCheck = () => {
    if (checking) return;
    setChecking(true);
    setHasSplit(false);

    // Roll random discriminants before landing on 0
    let counter = 0;
    const interval = setInterval(() => {
      const randVal = (Math.random() * 20 - 10).toFixed(4);
      setDeltaValue(`\\Delta = ${randVal}`);
      counter++;
      if (counter >= 12) {
        clearInterval(interval);
        setDeltaValue("\\Delta = 0.0000");
        setHasSplit(true);
        setChecking(false);
      }
    }, 200);
  };

  const handleReset = () => {
    setChecking(false);
    setDeltaValue("\\text{Aguardando...}");
    setHasSplit(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-xl mx-auto shadow-2xl">
      <style jsx>{`
        @keyframes radar {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .radar-sweep {
          animation: radar 2s linear infinite;
        }
      `}</style>

      <div className="text-center mb-4">
        <h4 className="text-lg font-bold text-zinc-100 tracking-tight font-sans">
          Teorema de Kani & O Desdobramento de Gênero 2
        </h4>
        <p className="text-xs text-zinc-400 font-serif mt-1">
          A assinatura geométrica que revelou o segredo do SIKE
        </p>
      </div>

      <div className="relative w-full aspect-[4/2] bg-zinc-900/40 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Radar sweeping overlay */}
        {checking && (
          <div
            className="radar-sweep absolute w-[260px] h-[260px] top-1/2 left-1/2 pointer-events-none rounded-full bg-[conic-gradient(from_0deg,transparent_60%,rgba(168,85,247,0.25)_100%)] z-10"
            style={{ transformOrigin: "0 0" }}
          />
        )}

        <svg className="w-full h-full" viewBox="0 0 400 180">
          <defs>
            <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Radar background circles */}
          <circle cx="200" cy="90" r="130" stroke="#1f1f23" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="90" r="90" stroke="#1f1f23" strokeWidth="0.5" fill="none" />
          <circle cx="200" cy="90" r="50" stroke="#1f1f23" strokeWidth="0.5" fill="none" />
          <line x1="70" y1="90" x2="330" y2="90" stroke="#1f1f23" strokeWidth="0.5" />
          <line x1="200" y1="20" x2="200" y2="160" stroke="#1f1f23" strokeWidth="0.5" />

          {/* LEMNISCATE (Genus-2 Torus Representation) */}
          <path
            d={lemniscateD}
            fill="none"
            stroke="#a855f7"
            strokeWidth="3.5"
            filter="url(#glow-purple)"
            className="transition-all duration-1000"
            style={{
              opacity: hasSplit ? 0.08 : checking ? 0.9 : 0.75,
              transform: hasSplit ? "scale(0.85)" : "scale(1)",
              transformOrigin: "200px 90px",
            }}
          />

          {/* TWO CIRCLES (Split product of elliptic curves) */}
          <g
            className="transition-all duration-1000"
            style={{
              opacity: hasSplit ? 1 : 0,
              transform: hasSplit ? "translate(0px, 0px)" : "translate(0px, 10px)",
            }}
          >
            {/* Left Elliptic Curve E1 */}
            <circle
              cx="135"
              cy="90"
              r="40"
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              filter="url(#glow-green)"
            />
            <text x="135" y="94" textAnchor="middle" fill="#10b981" className="text-[12px] font-bold font-mono">
              E₁
            </text>

            {/* Right Elliptic Curve E2 */}
            <circle
              cx="265"
              cy="90"
              r="40"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              filter="url(#glow-green)"
            />
            <text x="265" y="94" textAnchor="middle" fill="#3b82f6" className="text-[12px] font-bold font-mono">
              E₂
            </text>

            {/* Plus operator / Split line */}
            <line x1="185" y1="90" x2="215" y2="90" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="200" y1="75" x2="200" y2="105" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3,3" />
          </g>

          {/* Center Point */}
          <circle cx="200" cy="90" r="3" fill="#18181b" stroke="#71717a" strokeWidth="1" />
        </svg>

        {/* Floating status */}
        <div className="absolute top-3 left-4">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Geometria</span>
          <span className={`text-[10px] font-bold uppercase transition-colors ${hasSplit ? "text-emerald-400" : "text-purple-400"}`}>
            {hasSplit ? "Gênero 1 × Gênero 1" : "Gênero 2 (Double Torus)"}
          </span>
        </div>
      </div>

      {/* Discriminant Math Block */}
      <div className="mt-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between w-full">
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">Discriminante de Kani</span>
        <div className={`font-mono text-sm font-bold ${hasSplit ? "text-emerald-400 animate-pulse" : checking ? "text-purple-400 animate-pulse" : "text-zinc-500"}`}>
          {deltaValue === "\\text{Aguardando...}" ? (
            <span>Δ = ?</span>
          ) : deltaValue === "\\text{Calculando...}" ? (
            <span>Δ = ...</span>
          ) : (
            <span>{deltaValue.replace("\\Delta =", "Δ =")}</span>
          )}
        </div>
      </div>

      {/* Button controls */}
      <div className="w-full mt-5 flex justify-center space-x-3">
        {!hasSplit ? (
          <button
            onClick={handleCheck}
            disabled={checking}
            className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase font-sans transition-all duration-300 hover:scale-105 active:scale-95 ${
              checking
                ? "bg-purple-950/20 border border-purple-500/30 text-purple-500 cursor-not-allowed"
                : "bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-400"
            }`}
          >
            {checking ? "Varrendo Espaço de Isogenia..." : "Analisar Caminho de Isogenia"}
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-300 rounded-xl text-xs font-semibold tracking-wider uppercase font-sans transition-colors duration-200"
          >
            Restaurar Lemniscatas (Gênero 2)
          </button>
        )}
      </div>

      {/* Explanatory text */}
      <div className="w-full mt-4 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
        <p className="text-[11px] text-zinc-400 font-serif leading-relaxed">
          {checking ? (
            <span>Mapeando a superfície abeliana de gênero 2. Calculando o discriminante de colapso de Kani...</span>
          ) : hasSplit ? (
            <span>
              O discriminante <span className="text-emerald-400">$\Delta = 0$</span> prova que a curva de gênero 2 é isógena a um produto de duas curvas elípticas (<span className="text-emerald-400">$E_1 \times E_2$</span>). O segredo foi quebrado!
            </span>
          ) : (
            <span>
              Clique para executar a varredura. Se o caminho de isogenia revelar que o discriminante é <span className="text-purple-400">$\Delta = 0$</span>, a curva hiperelíptica se divide em duas, revelando as chaves privadas.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
