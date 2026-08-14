"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

// Helper to format complex numbers cleanly
function fmtComplex(c: Complex, decimals: number = 2): string {
  const re = c.re.toFixed(decimals);
  const im = c.im.toFixed(decimals);
  const sign = c.im >= 0 ? "+" : "-";
  return `${re} ${sign} ${Math.abs(c.im).toFixed(decimals)}i`;
}

// -------------------------------------------------------------
// WIDGET 1: OrthogonalProjectionVisualizer
// -------------------------------------------------------------
export function OrthogonalProjectionVisualizer() {
  const coeffs = usePolynomial();
  const [step, setStep] = useState<number>(0);
  const [R, setR] = useState<number>(1.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPt, setIsPt] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPt(window.location.pathname.includes("/pt"));
    }
  }, []);

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
    const lCoeffs = Array.from({ length: degree + 1 }, () => ({ re: 0, im: 0 }));
    lCoeffs[degree] = leadingCoeff;
    return evaluatePolynomial(lCoeffs, z);
  };

  const segments = 32;
  const numPoints = segments * 4 + 1;

  const zPoints = useMemo(() => {
    const pts: Complex[] = [];
    for (let i = 0; i < segments; i++) pts.push({ re: R, im: -R + (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: R - (i / segments) * 2 * R, im: R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R, im: R - (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R + (i / segments) * 2 * R, im: -R });
    pts.push({ re: R, im: -R });
    return pts;
  }, [R, segments]);

  const { lPts, pPts } = useMemo(() => {
    return {
      lPts: zPoints.map(z => evaluateLeading(z)),
      pPts: zPoints.map(z => evaluatePolynomial(coeffs, z)),
    };
  }, [zPoints, coeffs, degree, leadingCoeff]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % numPoints);
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying, numPoints]);

  const activeL = lPts[step] || { re: 0, im: 0 };
  const activeP = pPts[step] || { re: 0, im: 0 };

  // Inner product calculation: <L(t), P(t)> = L_x * P_x + L_y * P_y
  const innerProduct = activeL.re * activeP.re + activeL.im * activeP.im;
  const isPositive = innerProduct > 0;

  // Render SVG
  const maxVal = useMemo(() => {
    let m = 1.0;
    lPts.forEach(pt => m = Math.max(m, Math.abs(pt.re), Math.abs(pt.im)));
    pPts.forEach(pt => m = Math.max(m, Math.abs(pt.re), Math.abs(pt.im)));
    return m * 1.15;
  }, [lPts, pPts]);

  const mapScale = 110 / (maxVal || 1.0);
  const toX = (val: number) => 150 + val * mapScale;
  const toY = (val: number) => 150 - val * mapScale;

  const lX = toX(activeL.re);
  const lY = toY(activeL.im);
  const pX = toX(activeP.re);
  const pY = toY(activeP.im);

  // Orthogonal line coordinates
  // L_perp = (-L_y, L_x)
  const normL = Math.hypot(activeL.re, activeL.im);
  const perpX = -activeL.im / (normL || 1);
  const perpY = activeL.re / (normL || 1);

  const orthLineX1 = toX(perpX * maxVal * 2);
  const orthLineY1 = toY(perpY * maxVal * 2);
  const orthLineX2 = toX(-perpX * maxVal * 2);
  const orthLineY2 = toY(-perpY * maxVal * 2);

  // Generate SVG path for the positive half-plane shading
  const angleL = Math.atan2(activeL.im, activeL.re);
  const angleStart = angleL - Math.PI / 2;
  const angleEnd = angleL + Math.PI / 2;
  const rSvg = 135;

  const x1 = 150 + rSvg * Math.cos(angleStart);
  const y1 = 150 - rSvg * Math.sin(angleStart);
  const x2 = 150 + rSvg * Math.cos(angleEnd);
  const y2 = 150 - rSvg * Math.sin(angleEnd);

  const halfPlanePath = `M 150,150 L ${x1},${y1} A ${rSvg},${rSvg} 0 0,1 ${x2},${y2} Z`;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-6 shadow-2xl max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-1 rounded-full">
          {isPt ? "Conceito 1: O Semiplano Ortogonal" : "Concept 1: The Orthogonal Half-Plane"}
        </span>
        <h3 className="text-lg font-bold text-zinc-100 mt-2 font-sans">
          {isPt ? "Projeção Positiva de Vetores" : "Positive Vector Projections"}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
          {isPt
            ? "O semiplano verde representa a região onde o produto interno <L(t), P(t)> é positivo. Enquanto o vetor do polinômio completo P(t) (esmeralda) permanecer no lado positivo da linha limite perpendicular, a diferença angular é menor que 90°, impossibilitando o descompasso de voltas."
            : "The green semi-plane represents the region where the inner product <L(t), P(t)> is positive. As long as the full polynomial vector P(t) (emerald) stays on the positive side of the perpendicular boundary line, the angular difference is less than 90°, preventing turn mismatch."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* SVG Display */}
        <div className="relative border border-zinc-850 rounded-xl bg-zinc-900/10 p-2 overflow-hidden aspect-square max-w-[340px] mx-auto w-full">
          <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
            {/* Grid */}
            <line x1={0} y1={150} x2={300} y2={150} stroke="#1f1f23" strokeWidth={1} />
            <line x1={150} y1={0} x2={150} y2={300} stroke="#1f1f23" strokeWidth={1} />

            {/* Shaded Positive Half-Plane */}
            <path d={halfPlanePath} fill="#10b981" fillOpacity={0.05} stroke="none" />

            {/* Orthogonal Boundary Line */}
            <line x1={orthLineX1} y1={orthLineY1} x2={orthLineX2} y2={orthLineY2} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" />

            {/* Vectors */}
            {/* L(t) - Leading Term (Blue) */}
            <line x1={150} y1={150} x2={lX} y2={lY} stroke="#3b82f6" strokeWidth={3} />
            <circle cx={lX} cy={lY} r={4} fill="#3b82f6" />

            {/* P(t) - Full Polynomial (Emerald) */}
            <line x1={150} y1={150} x2={pX} y2={pY} stroke="#10b981" strokeWidth={3} />
            <circle cx={pX} cy={pY} r={4} fill="#10b981" />

            {/* Origin */}
            <circle cx={150} cy={150} r={4} fill="#ffffff" />
          </svg>
        </div>

        {/* Telemetry and Controls */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-zinc-500">{isPt ? "Telemetria Vetorial" : "Vector Telemetry"}</div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">L(t):</span>
              <span className="text-blue-400 font-bold">{fmtComplex(activeL)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">P(t):</span>
              <span className="text-emerald-400 font-bold">{fmtComplex(activeP)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">{isPt ? "Produto Interno:" : "Inner Product:"}</span>
              <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-rose-500 animate-pulse"}`}>
                {innerProduct.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">{isPt ? "Estado da Projeção:" : "Projection Status:"}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-500"}`}>
                {isPositive ? (isPt ? "AGUDO (<90°)" : "ACUTE (<90°)") : (isPt ? "OBTUSO (VIOLADO)" : "OBTUSE (VIOLATED)")}
              </span>
            </div>
          </div>

          {/* Slider Controls */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{isPt ? "Raio do Domínio (R)" : "Domain Radius (R)"}</span>
                <span className="text-zinc-300">{R.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                value={R}
                onChange={(e) => {
                  setR(parseFloat(e.target.value));
                  setStep(0);
                }}
                className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{isPt ? "Passo do Traçado (t)" : "Trace Step (t)"}</span>
                <span className="text-zinc-300">{step}/{numPoints - 1}</span>
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
                className="w-full accent-blue-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors ${
                  isPlaying
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                }`}
              >
                {isPlaying ? "PAUSE" : "PLAY"}
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setIsPlaying(false);
                }}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors font-mono text-xs"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// WIDGET 2: ErrorDiskConstraintVisualizer
// -------------------------------------------------------------
export function ErrorDiskConstraintVisualizer() {
  const coeffs = usePolynomial();
  const [step, setStep] = useState<number>(0);
  const [R, setR] = useState<number>(1.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPt, setIsPt] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPt(window.location.pathname.includes("/pt"));
    }
  }, []);

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
    const lCoeffs = Array.from({ length: degree + 1 }, () => ({ re: 0, im: 0 }));
    lCoeffs[degree] = leadingCoeff;
    return evaluatePolynomial(lCoeffs, z);
  };

  const segments = 32;
  const numPoints = segments * 4 + 1;

  const zPoints = useMemo(() => {
    const pts: Complex[] = [];
    for (let i = 0; i < segments; i++) pts.push({ re: R, im: -R + (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: R - (i / segments) * 2 * R, im: R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R, im: R - (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R + (i / segments) * 2 * R, im: -R });
    pts.push({ re: R, im: -R });
    return pts;
  }, [R, segments]);

  const { lPts, pPts } = useMemo(() => {
    return {
      lPts: zPoints.map(z => evaluateLeading(z)),
      pPts: zPoints.map(z => evaluatePolynomial(coeffs, z)),
    };
  }, [zPoints, coeffs, degree, leadingCoeff]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % numPoints);
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying, numPoints]);

  const activeL = lPts[step] || { re: 0, im: 0 };
  const activeP = pPts[step] || { re: 0, im: 0 };

  // Error vector: E(t) = P(t) - L(t)
  const activeE = { re: activeP.re - activeL.re, im: activeP.im - activeL.im };
  const errorNorm = Math.hypot(activeE.re, activeE.im);

  // Render SVG
  const maxVal = useMemo(() => {
    let m = 1.0;
    lPts.forEach(pt => m = Math.max(m, Math.abs(pt.re), Math.abs(pt.im)));
    pPts.forEach(pt => m = Math.max(m, Math.abs(pt.re), Math.abs(pt.im)));
    return m * 1.15;
  }, [lPts, pPts]);

  const mapScale = 110 / (maxVal || 1.0);
  const toX = (val: number) => 150 + val * mapScale;
  const toY = (val: number) => 150 - val * mapScale;

  const lX = toX(activeL.re);
  const lY = toY(activeL.im);
  const pX = toX(activeP.re);
  const pY = toY(activeP.im);
  const eRad = errorNorm * mapScale;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-6 shadow-2xl max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-rose-400 font-mono bg-rose-950/40 border border-rose-800/30 px-2.5 py-1 rounded-full">
          {isPt ? "Conceito 2: O Disco de Erro" : "Concept 2: The Error Disk Constraint"}
        </span>
        <h3 className="text-lg font-bold text-zinc-100 mt-2 font-sans">
          {isPt ? "Restrição Geométrica do Vetor P(t)" : "Geometric Vector Constraint"}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
          {isPt
            ? "P(t) é a soma vetorial L(t) + E(t). Isso obriga geometricamente que o vetor P(t) (esmeralda) termine estritamente dentro do disco de erro vermelho (com raio correspondente à norma do erro ||E(t)||) centralizado no topo do vetor guia L(t) (azul)."
            : "P(t) is the vector sum L(t) + E(t). This geometrically forces the vector P(t) (emerald) to terminate strictly within the red error disk (with a radius corresponding to the norm ||E(t)||) centered at the tip of the base vector L(t) (blue)."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* SVG Display */}
        <div className="relative border border-zinc-850 rounded-xl bg-zinc-900/10 p-2 overflow-hidden aspect-square max-w-[340px] mx-auto w-full">
          <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
            {/* Grid */}
            <line x1={0} y1={150} x2={300} y2={150} stroke="#1f1f23" strokeWidth={1} />
            <line x1={150} y1={0} x2={150} y2={300} stroke="#1f1f23" strokeWidth={1} />

            {/* Error Disk centered at L(t) */}
            <circle cx={lX} cy={lY} r={eRad} fill="#f43f5e" fillOpacity={0.1} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" />

            {/* Vectors */}
            {/* L(t) (Blue) */}
            <line x1={150} y1={150} x2={lX} y2={lY} stroke="#3b82f6" strokeWidth={3} />
            <circle cx={lX} cy={lY} r={4} fill="#3b82f6" />

            {/* P(t) (Emerald) */}
            <line x1={150} y1={150} x2={pX} y2={pY} stroke="#10b981" strokeWidth={2.5} />
            <circle cx={pX} cy={pY} r={4} fill="#10b981" />

            {/* E(t) - Connecting vector from L to P (Magenta) */}
            <line x1={lX} y1={lY} x2={pX} y2={pY} stroke="#d946ef" strokeWidth={2} strokeDasharray="2 2" />

            {/* Origin */}
            <circle cx={150} cy={150} r={4} fill="#ffffff" />
          </svg>
        </div>

        {/* Telemetry and Controls */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-zinc-500">{isPt ? "Álgebra Vetorial" : "Vector Algebra"}</div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">||L(t)||:</span>
              <span className="text-blue-400 font-bold">{Math.hypot(activeL.re, activeL.im).toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">||E(t)|| ({isPt ? "Raio do Disco" : "Disk Radius"}):</span>
              <span className="text-rose-400 font-bold">{errorNorm.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">||P(t)||:</span>
              <span className="text-emerald-400 font-bold">{Math.hypot(activeP.re, activeP.im).toFixed(3)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">{isPt ? "Invariante de Soma:" : "Sum Invariant:"}</span>
              <span className="text-zinc-200 font-bold font-serif">P(t) = L(t) + E(t)</span>
            </div>
          </div>

          {/* Slider Controls */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{isPt ? "Raio do Domínio (R)" : "Domain Radius (R)"}</span>
                <span className="text-zinc-300">{R.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                value={R}
                onChange={(e) => {
                  setR(parseFloat(e.target.value));
                  setStep(0);
                }}
                className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{isPt ? "Passo do Traçado (t)" : "Trace Step (t)"}</span>
                <span className="text-zinc-300">{step}/{numPoints - 1}</span>
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
                className="w-full accent-blue-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors ${
                  isPlaying
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                }`}
              >
                {isPlaying ? "PAUSE" : "PLAY"}
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setIsPlaying(false);
                }}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors font-mono text-xs"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// WIDGET 3: AsymptoticScalingVisualizer
// -------------------------------------------------------------
export function AsymptoticScalingVisualizer() {
  const coeffs = usePolynomial();
  const [step, setStep] = useState<number>(0);
  const [R, setR] = useState<number>(0.5); // Start small to showcase enclosure!
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPt, setIsPt] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPt(window.location.pathname.includes("/pt"));
    }
  }, []);

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
    const lCoeffs = Array.from({ length: degree + 1 }, () => ({ re: 0, im: 0 }));
    lCoeffs[degree] = leadingCoeff;
    return evaluatePolynomial(lCoeffs, z);
  };

  const segments = 32;
  const numPoints = segments * 4 + 1;

  const zPoints = useMemo(() => {
    const pts: Complex[] = [];
    for (let i = 0; i < segments; i++) pts.push({ re: R, im: -R + (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: R - (i / segments) * 2 * R, im: R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R, im: R - (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R + (i / segments) * 2 * R, im: -R });
    pts.push({ re: R, im: -R });
    return pts;
  }, [R, segments]);

  const { lPts, pPts } = useMemo(() => {
    return {
      lPts: zPoints.map(z => evaluateLeading(z)),
      pPts: zPoints.map(z => evaluatePolynomial(coeffs, z)),
    };
  }, [zPoints, coeffs, degree, leadingCoeff]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % numPoints);
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying, numPoints]);

  const activeL = lPts[step] || { re: 0, im: 0 };
  const activeP = pPts[step] || { re: 0, im: 0 };

  // Calculate norms and ratios
  const normL = Math.hypot(activeL.re, activeL.im);
  const activeE = { re: activeP.re - activeL.re, im: activeP.im - activeL.im };
  const normE = Math.hypot(activeE.re, activeE.im);

  const ratio = normE / (normL || 1.0);
  const isSatisfied = normL > normE; // Rouche condition satisfied at this point!

  // Render SVG with absolute centering
  const maxVal = useMemo(() => {
    let m = 1.0;
    lPts.forEach(pt => m = Math.max(m, Math.abs(pt.re), Math.abs(pt.im)));
    pPts.forEach(pt => m = Math.max(m, Math.abs(pt.re), Math.abs(pt.im)));
    return m * 1.15;
  }, [lPts, pPts]);

  const mapScale = 110 / (maxVal || 1.0);
  const toX = (val: number) => 150 + val * mapScale;
  const toY = (val: number) => 150 - val * mapScale;

  const lX = toX(activeL.re);
  const lY = toY(activeL.im);
  const pX = toX(activeP.re);
  const pY = toY(activeP.im);
  const eRad = normE * mapScale;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-6 shadow-2xl max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-blue-400 font-mono bg-blue-950/40 border border-blue-800/30 px-2.5 py-1 rounded-full">
          {isPt ? "Conceito 3: Escalonamento Assintótico" : "Concept 3: Asymptotic Scaling"}
        </span>
        <h3 className="text-lg font-bold text-zinc-100 mt-2 font-sans">
          {isPt ? "Separação Assintótica da Origem" : "Asymptotic Origin Separation"}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
          {isPt
            ? "Mova o controle deslizante de R. Observe como em R pequeno (ex: 0.5), o erro engloba a origem. À medida que R cresce, o comprimento vetorial ||L(t)|| (escala polinomial R^n) cresce muito mais rápido que o raio do erro ||E(t)|| (escala R^{n-1}). A origem é expelida para fora do disco, blindando a trajetória."
            : "Slide the R controller. Notice that at small R (e.g. 0.5), the error disk encloses the origin. As R scales, the vector length ||L(t)|| (polynomial scale R^n) outgrows the error radius ||E(t)|| (scale R^{n-1}) rapidly. The origin is forced out of the disk, locking the trajectory."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* SVG Display */}
        <div className="relative border border-zinc-850 rounded-xl bg-zinc-900/10 p-2 overflow-hidden aspect-square max-w-[340px] mx-auto w-full">
          <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
            {/* Grid */}
            <line x1={0} y1={150} x2={300} y2={150} stroke="#1f1f23" strokeWidth={1} />
            <line x1={150} y1={0} x2={150} y2={300} stroke="#1f1f23" strokeWidth={1} />

            {/* Error Disk */}
            <circle cx={lX} cy={lY} r={eRad} fill={isSatisfied ? "#3b82f6" : "#f43f5e"} fillOpacity={0.08} stroke={isSatisfied ? "#3b82f6" : "#f43f5e"} strokeWidth={1.5} />

            {/* Base Vector L(t) */}
            <line x1={150} y1={150} x2={lX} y2={lY} stroke="#3b82f6" strokeWidth={3} />
            <circle cx={lX} cy={lY} r={4} fill="#3b82f6" />

            {/* Polynomial Vector P(t) */}
            <line x1={150} y1={150} x2={pX} y2={pY} stroke="#10b981" strokeWidth={2.5} />
            <circle cx={pX} cy={pY} r={4} fill="#10b981" />

            {/* Origin (Gold highlight if safely excluded, red pulse if enclosed) */}
            <circle cx={150} cy={150} r={isSatisfied ? 5 : 6} fill={isSatisfied ? "#f59e0b" : "#ef4444"} className={isSatisfied ? "" : "animate-ping"} />
            <circle cx={150} cy={150} r={4} fill={isSatisfied ? "#fbbf24" : "#f43f5e"} />
          </svg>
        </div>

        {/* Telemetry and Controls */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl space-y-2">
            <div className="text-[10px] font-mono text-zinc-500">{isPt ? "Relação de Escala" : "Scaling Ratio"}</div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">||L(t)|| (Dominante):</span>
              <span className="text-blue-400 font-bold">{normL.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">||E(t)|| (Erro):</span>
              <span className="text-rose-400 font-bold">{normE.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">{isPt ? "Razão de Crescimento (||E||/||L||):" : "Growth Ratio (||E||/||L||):"}</span>
              <span className="text-zinc-200 font-bold">{ratio.toFixed(3)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">{isPt ? "Condição de Rouché:" : "Rouché Condition:"}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSatisfied ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-500 animate-pulse"}`}>
                {isSatisfied ? (isPt ? "ATENDIDA (Origem Fora)" : "SATISFIED (Origin Outside)") : (isPt ? "VIOLADA (Origem Dentro)" : "VIOLATED (Origin Inside)")}
              </span>
            </div>
          </div>

          {/* Slider Controls */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{isPt ? "Raio do Domínio (R)" : "Domain Radius (R)"}</span>
                <span className="text-zinc-300">{R.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                value={R}
                onChange={(e) => {
                  setR(parseFloat(e.target.value));
                  setStep(0);
                }}
                className="w-full accent-blue-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{isPt ? "Passo do Traçado (t)" : "Trace Step (t)"}</span>
                <span className="text-zinc-300">{step}/{numPoints - 1}</span>
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
                className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors ${
                  isPlaying
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                }`}
              >
                {isPlaying ? "PAUSE" : "PLAY"}
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setIsPlaying(false);
                }}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors font-mono text-xs"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
