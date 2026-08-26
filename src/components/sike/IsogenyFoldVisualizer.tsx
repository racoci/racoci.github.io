"use client";

import React, { useState } from "react";

export default function IsogenyFoldVisualizer() {
  const [factor, setFactor] = useState(0); // 0 (original E) to 1 (folded E/A)

  const width = 400;
  const height = 200;
  const centerX = 200;
  const centerY = 100;
  const scaleX = 42;
  const scaleY = 50;

  // Generate path for the main curve
  // Under an isogeny of degree 3, we quotient by a kernel of 3 points.
  // The curve "compresses" horizontally (frequency increases) and we show folding layers.
  const getCurvePath = (freqMultiplier: number, compressX: number) => {
    const points: string[] = [];
    const step = 0.05;
    for (let x = -4.5; x <= 4.5; x += step) {
      const mathY = Math.sin(x * freqMultiplier) * Math.cos(x * 0.2);
      const cx = centerX + x * scaleX * compressX;
      const cy = centerY - mathY * scaleY;
      points.push(`${cx},${cy}`);
    }
    return `M ${points.join(" L ")}`;
  };

  // Original curve (frequency 1, no horizontal compression)
  const originalD = getCurvePath(1, 1);

  // Dynamic folded curve (frequency goes from 1 to 3, horizontal spacing compresses)
  const currentFreq = 1 + factor * 2;
  const currentCompress = 1 - factor * 0.4;
  const dynamicD = getCurvePath(currentFreq, currentCompress);

  // Kernel points: points in the kernel A (degree 3 means 3 points: -2.5, 0, 2.5)
  // As factor -> 1, these points "collapse" to the origin (centerX) representing quotienting.
  const kernelOffsets = [-2.5, 0, 2.5];

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-xl mx-auto shadow-2xl">
      <div className="text-center mb-4">
        <h4 className="text-lg font-bold text-zinc-100 tracking-tight font-sans">
          Morfismo de Isogenia: O Colapso do Núcleo
        </h4>
        <p className="text-xs text-zinc-400 font-serif mt-1">
          Mapeamento <span className="text-purple-400">$\phi: E \to E/A$</span>. Fator de dobra:{" "}
          <span className="text-rose-400 font-semibold">{(factor * 100).toFixed(0)}%</span>
        </p>
      </div>

      <div className="relative w-full aspect-[2/1] bg-zinc-900/40 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          <defs>
            <filter id="glow-strong" x="-30%" y="-30%" width="160%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="isogenyGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Grid lines that compress horizontally */}
          <g stroke="#27272a" strokeWidth="0.5" strokeDasharray="3,3">
            <line x1="0" y1={centerY} x2={width} y2={centerY} />
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => {
              const cx = centerX + i * scaleX * currentCompress;
              return <line key={i} x1={cx} y1="0" x2={cx} y2={height} />;
            })}
          </g>

          {/* Background / Original Curve Shadow (static) */}
          {factor > 0 && (
            <path
              d={originalD}
              fill="none"
              stroke="#27272a"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
          )}

          {/* Folded layers (representing multi-to-one mapping) */}
          {factor > 0.1 && (
            <>
              {/* Layer 1 (shifted negative) */}
              <path
                d={getCurvePath(currentFreq, currentCompress)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                opacity={factor * 0.15}
                transform={`translate(${-12 * factor}, 0)`}
              />
              {/* Layer 2 (shifted positive) */}
              <path
                d={getCurvePath(currentFreq, currentCompress)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                opacity={factor * 0.15}
                transform={`translate(${12 * factor}, 0)`}
              />
            </>
          )}

          {/* Main Dynamic Isogeny Curve */}
          <path
            d={dynamicD}
            fill="none"
            stroke="url(#isogenyGlow)"
            strokeWidth="3.5"
            filter="url(#glow-strong)"
            className="transition-all duration-300"
          />

          {/* Kernel Points: these points are the subgroup 'A'.
              Under the quotient map \phi, the entire subgroup collapses to the identity (origin 0). */}
          {kernelOffsets.map((offset, idx) => {
            // Collapse points to the center as factor goes from 0 to 1
            const xVal = offset * (1 - factor);
            const cx = centerX + xVal * scaleX;
            return (
              <g key={idx}>
                {/* Glowing ring */}
                <circle
                  cx={cx}
                  cy={centerY}
                  r={8 + factor * 4}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1"
                  opacity={0.4 * (1 - factor)}
                  className="animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                {/* Point */}
                <circle
                  cx={cx}
                  cy={centerY}
                  r="6"
                  fill="#f43f5e"
                  stroke="#18181b"
                  strokeWidth="2"
                  filter="url(#glow-strong)"
                />
                {idx !== 1 && (
                  <text
                    x={cx - 14}
                    y={centerY - 12}
                    fill="#f43f5e"
                    className="text-[10px] font-mono font-bold"
                    opacity={1 - factor}
                  >
                    {idx === 0 ? "-A" : "A"}
                  </text>
                )}
              </g>
            );
          })}

          {/* Identity Element Label */}
          <text
            x={centerX + 10}
            y={centerY - 12}
            fill="#a855f7"
            className="text-[11px] font-bold font-sans"
          >
            O
          </text>
        </svg>
      </div>

      {/* Slider Controls */}
      <div className="w-full mt-6 px-2">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-zinc-400 font-mono">
            Quocientar pelo núcleo <span className="text-rose-400 font-bold">A</span>:
          </label>
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-500">
            {factor === 0 ? "Curva Original E" : factor === 1 ? "Curva Quociente E/⟨A⟩" : "Transformando..."}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={factor}
          onChange={(e) => setFactor(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 focus:outline-none"
        />
      </div>

      {/* Explanation of the metaphor */}
      <div className="w-full mt-4 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
        <p className="text-[11px] text-zinc-400 font-serif leading-relaxed">
          {factor === 0 ? (
            <span>As esferas rosa representam os pontos do subgrupo <span className="text-rose-400 font-semibold">A</span> (o núcleo).</span>
          ) : factor < 0.95 ? (
            <span>À medida que o núcleo colapsa em direção à identidade <span className="text-purple-400">$O$</span>, a curva é geometricamente "dobrada" e comprimida sobre si mesma.</span>
          ) : (
            <span>Todo o subgrupo de núcleo <span className="text-rose-400 font-semibold">A</span> foi mapeado para a identidade. A curva resultante <span className="text-emerald-400">$E/\langle A \rangle$</span> é mais densa e tem outra geometria.</span>
          )}
        </p>
      </div>
    </div>
  );
}
