"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

export default function CountersVisualizer() {
  const coeffs = usePolynomial();
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [R, setR] = useState<number>(1.2);

  // Detect language from context (defaulting to EN/PT toggle)
  const [isPt, setIsPt] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPt(window.location.pathname.includes("/pt"));
    }
  }, []);

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
    const lCoeffs = Array.from({ length: degree + 1 }, () => ({ re: 0, im: 0 }));
    lCoeffs[degree] = leadingCoeff;
    return evaluatePolynomial(lCoeffs, z);
  };

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
  const { lPts, pPts, uL, uP } = useMemo(() => {
    const lPoints = zPoints.map(z => evaluateLeading(z));
    const pPoints = zPoints.map(z => evaluatePolynomial(coeffs, z));

    return {
      lPts: lPoints,
      pPts: pPoints,
      uL: getUSequence(lPoints),
      uP: getUSequence(pPoints),
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

  // Complex Plane Map dimensions and scaling
  const maxCoord = useMemo(() => {
    let maxVal = 1.0;
    lPts.forEach(pt => {
      maxVal = Math.max(maxVal, Math.abs(pt.re), Math.abs(pt.im));
    });
    pPts.forEach(pt => {
      maxVal = Math.max(maxVal, Math.abs(pt.re), Math.abs(pt.im));
    });
    return maxVal * 1.15; // 15% padding
  }, [lPts, pPts]);

  const mapScale = 160 / (maxCoord || 1.0);
  const toMapX = (re: number) => 200 + re * mapScale;
  const toMapY = (im: number) => 200 - im * mapScale;

  const traceLPath = useMemo(() => {
    if (lPts.length === 0) return "";
    return "M " + lPts.map(pt => {
      const x = toMapX(pt.re);
      const y = toMapY(pt.im);
      return `${Number.isFinite(x) ? x : 200},${Number.isFinite(y) ? y : 200}`;
    }).join(" L ") + " Z";
  }, [lPts, maxCoord]);

  const tracePPath = useMemo(() => {
    if (pPts.length === 0) return "";
    return "M " + pPts.map(pt => {
      const x = toMapX(pt.re);
      const y = toMapY(pt.im);
      return `${Number.isFinite(x) ? x : 200},${Number.isFinite(y) ? y : 200}`;
    }).join(" L ") + " Z";
  }, [pPts, maxCoord]);

  const currentLPoint = lPts[step] || { re: 0, im: 0 };
  const currentPPoint = pPts[step] || { re: 0, im: 0 };

  const mapLX = toMapX(currentLPoint.re);
  const mapLY = toMapY(currentLPoint.im);
  const mapPX = toMapX(currentPPoint.re);
  const mapPY = toMapY(currentPPoint.im);

  const currentLDist = Math.sqrt(currentLPoint.re ** 2 + currentLPoint.im ** 2);
  const currentPDist = Math.sqrt(currentPPoint.re ** 2 + currentPPoint.im ** 2);
  const leashLength = Math.sqrt(
    (currentPPoint.re - currentLPoint.re) ** 2 +
    (currentPPoint.im - currentLPoint.im) ** 2
  );
  const roucheMet = leashLength < currentLDist;
  const svgLeashRadius = leashLength * mapScale;
  const safeRadius = Number.isFinite(svgLeashRadius) ? svgLeashRadius : 0;

  const t = {
    title: isPt ? "Contadores de Voltas Desenrolados" : "Unrolled Winding Counters",
    playground: isPt ? "Playground 2: Topologia Combinatória" : "Playground 2: Combinatorial Topology",
    desc: isPt
      ? "Observe os contadores de quadrantes U_L(j) (Termo Líder) e U_P(j) (Polinômio Completo) se desenrolarem conforme percorremos a malha de contorno. Note que a divergência nunca excede 1 se o termo de erro for estritamente limitado."
      : "Watch the quadrant counters U_L(j) (Leading Term) and U_P(j) (Full Polynomial) unroll as we traverse the boundary mesh. Notice how their divergence never exceeds 1 if the error term is strictly bounded.",
    pause: isPt ? "PAUSAR" : "PAUSE",
    play: isPt ? "REPRODUZIR" : "PLAY",
    reset: isPt ? "REINICIAR" : "RESET",
    divergence: isPt ? "Divergência:" : "Divergence:",
    stepTracer: isPt ? "Rastreador de Passos da Malha (j)" : "Mesh Step Tracer (j)",
    radiusSlider: isPt ? "Raio do Domínio (R)" : "Domain Radius (R)",
    legendL: isPt ? "U_L (Líder)" : "U_L (Leading)",
    legendP: isPt ? "U_P (Polinômio)" : "U_P (Polynomial)",
    metaphorTitle: isPt ? "A Metáfora de Rouché: O Cão e a Guia" : "Rouché's Metaphor: The Dog on a Leash",
    metaphorDesc: isPt
      ? "Imagine uma pessoa (o termo dominante L(z), em azul) passeando com seu cachorro (o polinômio completo P(z), em verde) preso a uma guia (o termo de erro, em vermelho). Se o comprimento da guia for sempre menor que a distância da pessoa até a origem (o poste de luz dourado), então o cachorro é obrigado a dar exatamente o mesmo número de voltas ao redor do poste que seu dono! Conforme você aumenta o raio R do domínio, note como a guia fica proporcionalmente minúscula e as duas trajetórias se alinham quase perfeitamente."
      : "Imagine a person (the dominant leading term L(z), in blue) walking a dog (the full polynomial P(z), in green) on a leash (the error term, in red). If the leash length is always strictly shorter than the person's distance to the origin (the golden lamp post), then the dog is topologically forced to wind around the post exactly the same number of times as the person! As you increase the domain radius R, notice how the leash becomes proportionally minuscule, and the trajectories align almost perfectly.",
    stepLabel: isPt ? "Passo da Malha" : "Mesh Step",
    originLabel: isPt ? "Origem" : "Origin",
    personLabel: isPt ? "Pessoa L(z)" : "Person L(z)",
    dogLabel: isPt ? "Cão P(z)" : "Dog P(z)",
    leashLabel: isPt ? "Guia (Erro)" : "Leash (Error)",
    roucheStatus: isPt ? "Status Rouché:" : "Rouché Status:",
    roucheMetStatus: isPt ? "Satisfeito ✔️" : "Met ✔️",
    roucheUnmetStatus: isPt ? "Não Garantido ⚠️" : "Unverified ⚠️",
    geometryTitle: isPt ? "Geometria de Rouché" : "Rouché Geometry",
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-8 shadow-2xl shadow-emerald-950/20 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-mono bg-blue-950/40 border border-blue-800/30 px-2.5 py-1 rounded-full">
            {t.playground}
          </span>
          <h3 className="text-xl font-bold text-zinc-100 mt-2 font-sans">
            {t.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            {t.desc}
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
            {isPlaying ? t.pause : t.play}
          </button>
          <button
            onClick={() => {
              setStep(0);
              setIsPlaying(false);
            }}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all font-mono text-xs"
          >
            {t.reset}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6">
        {/* Left Column: Unrolled stair-step graph */}
        <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-4 shadow-inner flex flex-col justify-between w-full h-full min-h-[340px]">
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
              <text x={25} y={4} fill="#93c5fd" fontSize={11} fontFamily="monospace">{t.legendL}</text>
              <line x1={140} y1={0} x2={160} y2={0} stroke="#10b981" strokeWidth={3} />
              <text x={165} y={4} fill="#6ee7b7" fontSize={11} fontFamily="monospace">{t.legendP}</text>
            </g>
          </svg>

          {/* Dynamic Tooltip overlay */}
          <div className="absolute top-4 right-4 bg-zinc-900/90 border border-zinc-850 p-3 rounded-lg flex flex-col gap-1 min-w-[140px] shadow-xl backdrop-blur-sm">
            <div className="text-[10px] font-mono text-zinc-500 mb-1">{t.stepLabel} {step}/{numPoints - 1}</div>
            <div className="flex justify-between items-center gap-4 text-xs font-mono">
              <span className="text-blue-400">U_L:</span>
              <span className="text-zinc-200 font-bold">{currentUL}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-xs font-mono">
              <span className="text-emerald-400">U_P:</span>
              <span className="text-zinc-200 font-bold">{currentUP}</span>
            </div>
            <div className={`mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center gap-4 text-xs font-mono font-bold ${isViolated ? "text-rose-500" : "text-amber-400"}`}>
              <span>{t.divergence}</span>
              <span>{divergence}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Complex Plane Map (Rouché's Dog on a Leash) */}
        <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-4 shadow-inner flex flex-col justify-between w-full h-full min-h-[340px]">
          <svg viewBox="0 0 400 400" className="w-full h-auto max-w-full overflow-visible">
            {/* Grid & Axes */}
            <line x1={0} y1={200} x2={400} y2={200} stroke="#1f1f22" strokeWidth={1} />
            <line x1={200} y1={0} x2={200} y2={400} stroke="#1f1f22" strokeWidth={1} />
            
            {/* Radial ticks */}
            <circle cx={200} cy={200} r={50} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="2 2" />
            <circle cx={200} cy={200} r={100} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="2 2" />
            <circle cx={200} cy={200} r={150} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="2 2" />

            {/* Traces */}
            {traceLPath && (
              <path d={traceLPath} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.6} />
            )}
            {tracePPath && (
              <path d={tracePPath} fill="none" stroke="#10b981" strokeWidth={2} strokeOpacity={0.8} />
            )}

            {/* Rouché Error Boundary (Leash Circle around Person) */}
            {Number.isFinite(mapLX) && Number.isFinite(mapLY) && safeRadius > 0 && (
              <circle
                cx={mapLX}
                cy={mapLY}
                r={safeRadius}
                fill="#ef4444"
                fillOpacity={0.12}
                stroke="#f43f5e"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {/* Leash line */}
            {Number.isFinite(mapLX) && Number.isFinite(mapLY) && Number.isFinite(mapPX) && Number.isFinite(mapPY) && (
              <line x1={mapLX} y1={mapLY} x2={mapPX} y2={mapPY} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="2 2" />
            )}

            {/* Origin */}
            <circle cx={200} cy={200} r={5} fill="#eab308" stroke="#fef08a" strokeWidth={1} />
            <circle cx={200} cy={200} r={10} fill="none" stroke="#eab308" strokeWidth={0.5} strokeDasharray="2 2" strokeOpacity={0.5} />
            <text x={200} y={188} fill="#fef08a" fontSize={10} fontFamily="monospace" textAnchor="middle">{t.originLabel}</text>

            {/* Person Dot L(z) */}
            {Number.isFinite(mapLX) && Number.isFinite(mapLY) && (
              <circle cx={mapLX} cy={mapLY} r={5} fill="#3b82f6" stroke="#93c5fd" strokeWidth={1.5} />
            )}

            {/* Dog Dot P(z) */}
            {Number.isFinite(mapPX) && Number.isFinite(mapPY) && (
              <circle cx={mapPX} cy={mapPY} r={5} fill="#10b981" stroke="#6ee7b7" strokeWidth={1.5} />
            )}

            {/* Visual labels on map */}
            {Number.isFinite(mapLX) && Number.isFinite(mapLY) && (
              <text x={mapLX + 8} y={mapLY - 8} fill="#93c5fd" fontSize={9} fontFamily="monospace">L(z)</text>
            )}
            {Number.isFinite(mapPX) && Number.isFinite(mapPY) && (
              <text x={mapPX + 8} y={mapPY + 12} fill="#6ee7b7" fontSize={9} fontFamily="monospace">P(z)</text>
            )}
          </svg>

          {/* Map Overlay Stats */}
          <div className="absolute top-4 right-4 bg-zinc-900/90 border border-zinc-850 p-3 rounded-lg flex flex-col gap-1 min-w-[140px] shadow-xl backdrop-blur-sm">
            <div className="text-[10px] font-mono text-zinc-500 mb-1">{t.geometryTitle}</div>
            <div className="flex justify-between items-center gap-4 text-xs font-mono">
              <span className="text-blue-400">|L(z)|:</span>
              <span className="text-zinc-200 font-bold">{currentLDist.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-xs font-mono">
              <span className="text-emerald-400">|P(z)|:</span>
              <span className="text-zinc-200 font-bold">{currentPDist.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-xs font-mono">
              <span className="text-rose-400">{t.leashLabel}:</span>
              <span className="text-zinc-200 font-bold">{leashLength.toFixed(2)}</span>
            </div>
            <div className={`mt-2 pt-2 border-t border-zinc-850 flex flex-col gap-0.5 text-[10px] font-mono font-bold ${roucheMet ? "text-emerald-400" : "text-amber-500"}`}>
              <div className="flex justify-between items-center gap-2">
                <span>{t.roucheStatus}</span>
                <span className="text-right">{roucheMet ? t.roucheMetStatus : t.roucheUnmetStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="border-t border-zinc-800 mt-6 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Mesh Step Tracer */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-zinc-400 font-bold">{t.stepTracer}</span>
              <span className="text-xs font-mono text-blue-400 font-bold">{step} / {numPoints - 1}</span>
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

          {/* Slider 2: Domain Radius (R) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-zinc-400 font-bold">{t.radiusSlider}</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">R = {R.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.1"
              value={R}
              onChange={(e) => {
                setR(parseFloat(e.target.value));
              }}
              className="w-full accent-emerald-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ROUCHÉ METAPHOR CARD */}
      <div className="border-t border-zinc-800 mt-6 pt-5">
        <h4 className="text-sm font-bold text-zinc-200 mb-2 flex items-center gap-2">
          <span className="text-lg">🐕</span> {t.metaphorTitle}
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {t.metaphorDesc}
        </p>
      </div>
    </div>
  );
}
