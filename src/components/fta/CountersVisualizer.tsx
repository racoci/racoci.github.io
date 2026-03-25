"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

export default function CountersVisualizer() {
  const coeffs = usePolynomial();
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Find degree (highest non-zero coefficient index)
  const degree = useMemo(() => {
    let d = 0;
    for (let i = coeffs.length - 1; i >= 0; i--) {
      if (coeffs[i].re !== 0 || coeffs[i].im !== 0) {
        d = i;
        break;
      }
    }
    return d;
  }, [coeffs]);

  const leadingCoeff = coeffs[degree] || { re: 1, im: 0 };

  const evaluateLeading = (z: Complex) => {
    const lCoeffs = Array(degree + 1).fill({ re: 0, im: 0 });
    lCoeffs[degree] = leadingCoeff;
    return evaluatePolynomial(lCoeffs, z);
  };

  const R = 1.2;
  const segments = 32; // finer mesh to prevent skipping quadrants -> 128 points total
  const numPoints = segments * 4 + 1;

  // Generate boundary points on square in z-plane
  const zPoints = useMemo(() => {
    const pts: Complex[] = [];
    for (let i = 0; i < segments; i++) pts.push({ re: R, im: -R + (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: R - (i / segments) * 2 * R, im: R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R, im: R - (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R + (i / segments) * 2 * R, im: -R });
    pts.push({ re: R, im: -R });
    return pts;
  }, [R, segments]);

  const getQuadrant = (x: number, y: number): number => {
    if (x >= 0 && y >= 0) return 0;
    if (x < 0 && y >= 0) return 1;
    if (x < 0 && y < 0) return 2;
    return 3;
  };

  const getUSequence = (points: Complex[]): number[] => {
    const U = [0];
    let currU = 0;
    let prevQ = getQuadrant(points[0].re, points[0].im);

    for (let j = 1; j < points.length; j++) {
      const q = getQuadrant(points[j].re, points[j].im);
      let diff = q - prevQ;
      if (diff === -3) diff = 1;
      else if (diff === 3) diff = -1;
      else if (diff === -2 || diff === 2) {
        // Fallback for skipped quadrants
        diff = diff > 0 ? 2 : -2;
      }
      currU += diff;
      U.push(currU);
      prevQ = q;
    }
    return U;
  };

  // Compute L(z) and P(z)
  const { uL, uP } = useMemo(() => {
    const lPts = zPoints.map(z => evaluateLeading(z));
    const pPts = zPoints.map(z => evaluatePolynomial(coeffs, z));

    return {
      uL: getUSequence(lPts),
      uP: getUSequence(pPts),
    };
  }, [zPoints, coeffs, degree, leadingCoeff]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % numPoints);
    }, 60);
    return () => clearInterval(interval);
  }, [isPlaying, numPoints]);

  // SVG dimensions and scaling
  const width = 600;
  const height = 300;
  const paddingX = 40;
  const paddingY = 40;
  
  const maxY = Math.max(...uL, ...uP, 4 * degree + 1);
  const minY = Math.min(...uL, ...uP, -1);
  const rangeY = maxY - minY;

  const scaleX = (width - 2 * paddingX) / (numPoints - 1);
  const scaleY = (height - 2 * paddingY) / (rangeY || 1);

  const toSVGX = (j: number) => paddingX + j * scaleX;
  const toSVGY = (val: number) => height - paddingY - (val - minY) * scaleY;

  // Generate stair-step paths
  const generateStepPath = (uSeq: number[]) => {
    let path = `M ${toSVGX(0)},${toSVGY(uSeq[0])} `;
    for (let j = 1; j < uSeq.length; j++) {
      path += `L ${toSVGX(j)},${toSVGY(uSeq[j - 1])} `;
      path += `L ${toSVGX(j)},${toSVGY(uSeq[j])} `;
    }
    return path;
  };

  const pathL = generateStepPath(uL);
  const pathP = generateStepPath(uP);

  const currentUL = uL[step];
  const currentUP = uP[step];
  const divergence = Math.abs(currentUL - currentUP);
  const isViolated = divergence > 1;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-8 shadow-2xl shadow-emerald-950/20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-mono bg-blue-950/40 border border-blue-800/30 px-2.5 py-1 rounded-full">
            Playground 2: Combinatorial Topology
          </span>
          <h3 className="text-xl font-bold text-zinc-100 mt-2 font-sans">
            Unrolled Winding Counters
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Watch the quadrant counters <span className="italic font-serif">U_L(j)</span> (Leading Term) and <span className="italic font-serif">U_P(j)</span> (Full Polynomial) unroll as we traverse the boundary mesh. Notice how their divergence never exceeds 1 if the error term is strictly bounded.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
              isPlaying
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
            }`}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>
          <button
            onClick={() => {
              setStep(0);
              setIsPlaying(false);
            }}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all font-mono text-xs"
          >
            RESET
          </button>
        </div>
      </div>

      <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-4 shadow-inner mb-6 flex justify-center w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-full overflow-visible">
          {/* Y-Axis Grid Lines */}
          {Array.from({ length: rangeY + 1 }).map((_, i) => {
            const val = minY + i;
            const y = toSVGY(val);
            return (
              <g key={val}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#27272a" strokeWidth={1} strokeDasharray={val === 0 ? "none" : "3 3"} />
                <text x={paddingX - 10} y={y + 3} fill="#a1a1aa" fontSize={10} fontFamily="monospace" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Paths */}
          <path d={pathL} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeOpacity={0.8} />
          <path d={pathP} fill="none" stroke="#10b981" strokeWidth={2.5} strokeOpacity={0.8} />

          {/* Tracer vertical line */}
          <line
            x1={toSVGX(step)}
            y1={paddingY}
            x2={toSVGX(step)}
            y2={height - paddingY}
            stroke="#f43f5e"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Tracer Points */}
          <circle cx={toSVGX(step)} cy={toSVGY(currentUL)} r={4} fill="#3b82f6" />
          <circle cx={toSVGX(step)} cy={toSVGY(currentUP)} r={4} fill="#10b981" />

          {/* Legend */}
          <g transform={`translate(${paddingX + 10}, ${paddingY - 20})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke="#3b82f6" strokeWidth={3} />
            <text x={25} y={4} fill="#93c5fd" fontSize={12} fontFamily="monospace">U_L (Leading)</text>
            <line x1={130} y1={0} x2={150} y2={0} stroke="#10b981" strokeWidth={3} />
            <text x={155} y={4} fill="#6ee7b7" fontSize={12} fontFamily="monospace">U_P (Polynomial)</text>
          </g>
        </svg>

        {/* Dynamic Tooltip overlay */}
        <div className="absolute top-4 right-4 bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col gap-1 min-w[140px] shadow-xl">
          <div className="text-[10px] font-mono text-zinc-500 mb-1">Mesh Step {step}/{numPoints - 1}</div>
          <div className="flex justify-between items-center gap-4 text-xs font-mono">
            <span className="text-blue-400">U_L:</span>
            <span className="text-zinc-200 font-bold">{currentUL}</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-xs font-mono">
            <span className="text-emerald-400">U_P:</span>
            <span className="text-zinc-200 font-bold">{currentUP}</span>
          </div>
          <div className={`mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center gap-4 text-xs font-mono font-bold ${isViolated ? "text-rose-500" : "text-amber-400"}`}>
            <span>Divergence:</span>
            <span>{divergence}</span>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="border-t border-zinc-800 mt-6 pt-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-zinc-400 font-bold">Mesh Step Tracer (j)</span>
            </div>
            <input
              type="range"
              min="0"
              max={numPoints - 1}
              value={step}
              onChange={(e) => {
                setStep(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-blue-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
