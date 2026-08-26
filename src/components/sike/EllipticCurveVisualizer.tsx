"use client";

import React, { useState } from "react";

export default function EllipticCurveVisualizer() {
  const [xQ, setXQ] = useState(1.2);

  // Curve definition: y^2 = x^3 - x + 1
  const xMin = -1.324; // Root of x^3 - x + 1 = 0
  const xMax = 3.0;
  const scaleX = 65;
  const scaleY = 55;
  const centerX = 160;
  const centerY = 150;

  // Map math coords to SVG canvas (400x300)
  const toSVG = (x: number, y: number) => ({
    cx: centerX + x * scaleX,
    cy: centerY - y * scaleY,
  });

  // Plot the curve path
  const curvePoints: [number, number][] = [];
  const step = 0.02;
  for (let x = xMin; x <= xMax; x += step) {
    const y2 = x * x * x - x + 1;
    if (y2 >= 0) {
      curvePoints.push([x, Math.sqrt(y2)]);
    }
  }

  // Create single closed/continuous path
  const topBranch = curvePoints.map(([x, y]) => {
    const p = toSVG(x, y);
    return `${p.cx},${p.cy}`;
  });
  const bottomBranch = [...curvePoints].reverse().map(([x, y]) => {
    const p = toSVG(x, -y);
    return `${p.cx},${p.cy}`;
  });
  const curveD = `M ${bottomBranch.join(" L ")} L ${topBranch.join(" L ")}`;

  // Fixed Point P
  const xP = -1.0;
  const yP = 1.0; // P = (-1.0, 1.0) is on the curve: 1^2 = (-1)^3 - (-1) + 1 = 1

  // Dynamic Point Q
  // Ensure xQ doesn't exactly equal xP to prevent division by zero
  const adjXQ = Math.abs(xQ - xP) < 0.01 ? (xQ < xP ? xP - 0.01 : xP + 0.01) : xQ;
  const yQ2 = adjXQ * adjXQ * adjXQ - adjXQ + 1;
  const yQ = Math.sqrt(Math.max(0, yQ2));

  // Math for line PQ and third point R
  let lambda = 0;
  if (Math.abs(adjXQ - xP) > 1e-4) {
    lambda = (yQ - yP) / (adjXQ - xP);
  } else {
    // Tangent double point
    lambda = (3 * xP * xP - 1) / (2 * yP);
  }

  // Intersecting point R (x3, y3)
  const xR = lambda * lambda - xP - adjXQ;
  const yR = lambda * (xP - xR) - yP;

  // Sum point P + Q (x3, -y3)
  const xSum = xR;
  const ySum = -yR;

  // SVG Coordinates for drawing
  const svgP = toSVG(xP, yP);
  const svgQ = toSVG(adjXQ, yQ);
  const svgR = toSVG(xR, yR);
  const svgSum = toSVG(xSum, ySum);

  // Extend the secant line segment for visualization
  const xLineMin = -2.0;
  const yLineMin = lambda * (xLineMin - xP) + yP;
  const xLineMax = 3.0;
  const yLineMax = lambda * (xLineMax - xP) + yP;
  const svgLineStart = toSVG(xLineMin, yLineMin);
  const svgLineEnd = toSVG(xLineMax, yLineMax);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800/80 rounded-2xl w-full max-w-xl mx-auto shadow-2xl">
      <div className="text-center mb-4">
        <h4 className="text-lg font-bold text-zinc-100 tracking-tight font-sans">
          Visualizador de Curva Elíptica
        </h4>
        <p className="text-xs text-zinc-400 font-serif mt-1">
          Aritmética geométrica de pontos: <span className="text-amber-400 font-semibold">P + Q = S</span>
        </p>
      </div>

      <div className="relative w-full aspect-[4/3] bg-zinc-900/40 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner">
        {/* SVG Grid and Axes */}
        <svg className="w-full h-full" viewBox="0 0 400 300">
          <defs>
            <linearGradient id="curveGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Lines */}
          <g stroke="#27272a" strokeWidth="0.5" strokeDasharray="3,3">
            <line x1="0" y1={centerY} x2="400" y2={centerY} />
            <line x1={centerX} y1="0" x2={centerX} y2="300" />
            {[-1, 1, 2, 3].map((tick) => (
              <line
                key={`v-${tick}`}
                x1={centerX + tick * scaleX}
                y1="0"
                x2={centerX + tick * scaleX}
                y2="300"
              />
            ))}
            {[-2, -1, 1, 2].map((tick) => (
              <line
                key={`h-${tick}`}
                x1="0"
                y1={centerY - tick * scaleY}
                x2="400"
                y2={centerY - tick * scaleY}
              />
            ))}
          </g>

          {/* Axes labels */}
          <text x="385" y={centerY + 15} fill="#71717a" className="text-[10px] font-mono">X</text>
          <text x={centerX + 10} y="15" fill="#71717a" className="text-[10px] font-mono">Y</text>

          {/* Elliptic Curve Path */}
          <path
            d={curveD}
            fill="none"
            stroke="url(#curveGlow)"
            strokeWidth="3"
            filter="url(#glow)"
            className="transition-all duration-300"
          />

          {/* Secant / Tangent Line */}
          {svgLineStart.cy >= -100 && svgLineStart.cy <= 400 && (
            <line
              x1={svgLineStart.cx}
              y1={svgLineStart.cy}
              x2={svgLineEnd.cx}
              y2={svgLineEnd.cy}
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="4,2"
              opacity="0.4"
            />
          )}

          {/* Vertical Reflection Line */}
          {svgSum.cy >= 0 && svgSum.cy <= 300 && (
            <line
              x1={svgR.cx}
              y1={svgR.cy}
              x2={svgSum.cx}
              y2={svgSum.cy}
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
          )}

          {/* Point P */}
          <circle
            cx={svgP.cx}
            cy={svgP.cy}
            r="6"
            fill="#fbbf24"
            stroke="#18181b"
            strokeWidth="2"
            filter="url(#glow)"
          />
          <text
            x={svgP.cx - 15}
            y={svgP.cy - 12}
            fill="#fbbf24"
            className="text-xs font-bold font-sans"
          >
            P
          </text>

          {/* Point Q */}
          <circle
            cx={svgQ.cx}
            cy={svgQ.cy}
            r="6"
            fill="#3b82f6"
            stroke="#18181b"
            strokeWidth="2"
            filter="url(#glow)"
          />
          <text
            x={svgQ.cx + 10}
            y={svgQ.cy - 12}
            fill="#3b82f6"
            className="text-xs font-bold font-sans"
          >
            Q
          </text>

          {/* Point R (Intersection) */}
          {xR <= xMax && xR >= xMin && svgR.cy >= 0 && svgR.cy <= 300 && (
            <>
              <circle
                cx={svgR.cx}
                cy={svgR.cy}
                r="4.5"
                fill="#f43f5e"
                stroke="#18181b"
                strokeWidth="1.5"
              />
              <text
                x={svgR.cx + 10}
                y={svgR.cy + 15}
                fill="#f43f5e"
                className="text-[10px] font-sans opacity-80"
              >
                R
              </text>
            </>
          )}

          {/* Point P + Q (Sum) */}
          {xSum <= xMax && xSum >= xMin && svgSum.cy >= 0 && svgSum.cy <= 300 && (
            <>
              <circle
                cx={svgSum.cx}
                cy={svgSum.cy}
                r="7"
                fill="#10b981"
                stroke="#18181b"
                strokeWidth="2"
                filter="url(#glow)"
                className="animate-pulse"
              />
              <text
                x={svgSum.cx + 12}
                y={svgSum.cy + 4}
                fill="#10b981"
                className="text-xs font-bold font-sans"
              >
                P + Q
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Slider Controls */}
      <div className="w-full mt-6 px-2">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-zinc-400 font-mono">
            Mover ponto <span className="text-blue-400 font-bold">Q_x</span>: {xQ.toFixed(2)}
          </label>
          <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-500">
            y² = x³ - x + 1
          </span>
        </div>
        <input
          type="range"
          min="-1.1"
          max="2.5"
          step="0.05"
          value={xQ}
          onChange={(e) => setXQ(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
        />
      </div>

      {/* Mini Legend */}
      <div className="w-full mt-4 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
        <p className="text-[11px] text-zinc-400 font-serif leading-relaxed">
          Arraste o slider para alterar <span className="text-blue-400">$Q$</span>. A linha secante <span className="text-amber-300">$PQ$</span> intersecta a curva em <span className="text-rose-400">$R$</span>. Refletindo verticalmente em relação ao eixo-X, obtemos o ponto soma <span className="text-emerald-400">$P+Q$</span>.
        </p>
      </div>
    </div>
  );
}
