"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

type CurvePointData = {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ip: number;
  omega: number;
  cumulativeW: number;
};

export default function InnerProductWindingVisualizer() {
  const [selectedCurve, setSelectedCurve] = useState<string>("circle");
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showWedge, setShowWedge] = useState<boolean>(true);
  const [isPt, setIsPt] = useState<boolean>(true);

  // Detect language from path locale
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPt(window.location.pathname.includes("/pt"));
    }
  }, []);

  // Generate parametric curve points
  const getCurvePoint = (type: string, t: number): { x: number; y: number } => {
    switch (type) {
      case "circle":
        return { x: 2 * Math.cos(t), y: 2 * Math.sin(t) };
      case "shifted_circle":
        return { x: 2 * Math.cos(t) + 2.5, y: 2 * Math.sin(t) };
      case "limacon": {
        const rLim = 0.7 + 1.2 * Math.cos(t);
        // Slightly shifted so the crossover point and loops never hit the origin exactly
        return { x: rLim * Math.cos(t) + 0.25, y: rLim * Math.sin(t) + 0.1 };
      }
      case "epitrochoid":
        return {
          x: 1.5 * Math.cos(t) + 0.6 * Math.cos(4 * t),
          y: 1.5 * Math.sin(t) + 0.6 * Math.sin(4 * t)
        };
      case "clover": {
        const rClover = 1.3 + 0.5 * Math.sin(3 * t);
        return { x: rClover * Math.cos(t), y: rClover * Math.sin(t) };
      }
      default:
        return { x: 2 * Math.cos(t), y: 2 * Math.sin(t) };
    }
  };

  // Compute numerical derivative for robustness
  const getCurvePointAndVelocity = (type: string, t: number): { x: number; y: number; vx: number; vy: number } => {
    const p = getCurvePoint(type, t);
    const dt = 1e-4;
    const pPrev = getCurvePoint(type, t - dt);
    const pNext = getCurvePoint(type, t + dt);
    const vx = (pNext.x - pPrev.x) / (2 * dt);
    const vy = (pNext.y - pPrev.y) / (2 * dt);
    return { x: p.x, y: p.y, vx, vy };
  };

  const totalSteps = 300;

  // Precalculate curve data and cumulative winding
  const curveData = useMemo<CurvePointData[]>(() => {
    const data: CurvePointData[] = [];
    const dt = (2 * Math.PI) / totalSteps;
    let runningW = 0;

    for (let i = 0; i <= totalSteps; i++) {
      const t = (2 * Math.PI * i) / totalSteps;
      const { x, y, vx, vy } = getCurvePointAndVelocity(selectedCurve, t);
      const ip = x * vy - y * vx;
      const r2 = x * x + y * y;
      const omega = r2 > 1e-9 ? ip / r2 : 0;

      if (i > 0) {
        const prev = data[i - 1];
        // Trapezoidal integration rule for maximum accuracy
        runningW += (0.5 * (omega + prev.omega) * dt) / (2 * Math.PI);
      }

      data.push({
        t,
        x,
        y,
        vx,
        vy,
        ip,
        omega,
        cumulativeW: runningW,
      });
    }
    return data;
  }, [selectedCurve]);

  // Frame-rate independent playback loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTime;
      const stepDuration = (12000 / playSpeed) / totalSteps; // full cycle in 12s at 1x speed
      if (elapsed >= stepDuration) {
        setStep((prev) => (prev + Math.floor(elapsed / stepDuration)) % (totalSteps + 1));
        lastTime = now - (elapsed % stepDuration);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playSpeed]);

  const p = curveData[step] || curveData[0];

  // SVG Coordinates translation: Center is (200, 200), radius is 60px/unit
  const toSVGX = (val: number) => 200 + val * 60;
  const toSVGY = (val: number) => 200 - val * 60;

  // Vectors scale for visual rendering
  const vectorScale = 1.0;
  const d = Math.sqrt(p.x * p.x + p.y * p.y);
  const dv = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

  // Normalized Rotated Position (r^\perp) vector pointing from the curve point
  const rxEnd = useMemo(() => {
    if (d === 0) return { x: p.x, y: p.y };
    const ux = -p.y / d;
    const uy = p.x / d;
    return { x: p.x + ux * vectorScale, y: p.y + uy * vectorScale };
  }, [p.x, p.y, d]);

  // Normalized Velocity vector pointing from the curve point
  const vxEnd = useMemo(() => {
    if (dv === 0) return { x: p.x, y: p.y };
    const uvx = p.vx / dv;
    const uvy = p.vy / dv;
    return { x: p.x + uvx * vectorScale, y: p.y + uvy * vectorScale };
  }, [p.x, p.y, p.vx, p.vy, dv]);

  // Angle between rotated position and velocity (for wedge)
  const angleInfo = useMemo(() => {
    if (d === 0 || dv === 0) return { startAngle: 0, endAngle: 0, deltaDeg: 0 };
    // SVG Y is inverted, so let's get the absolute SVG angle of both vectors
    const ux = -p.y / d;
    const uy = p.x / d;
    const uvx = p.vx / dv;
    const uvy = p.vy / dv;

    // SVG angles (y inverted)
    const alpha = Math.atan2(-uy, ux);
    const beta = Math.atan2(-uvy, uvx);

    let diff = beta - alpha;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    return {
      startAngle: alpha,
      endAngle: alpha + diff,
      deltaDeg: (diff * 180) / Math.PI,
    };
  }, [p.x, p.y, p.vx, p.vy, d, dv]);

  // Generate SVG Wedge path around the curve point (radius = 35px)
  const svgWedgePath = useMemo(() => {
    const cx = toSVGX(p.x);
    const cy = toSVGY(p.y);
    const r = 35;
    const { startAngle, endAngle } = angleInfo;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const sweepFlag = endAngle >= startAngle ? 1 : 0;
    return `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0 ${sweepFlag} ${x2},${y2} Z`;
  }, [p.x, p.y, angleInfo]);

  // Telemetry: inner product chart scaling
  const ips = useMemo(() => curveData.map((d) => d.ip), [curveData]);
  const { maxIP, minIP } = useMemo(() => {
    let mx = Math.max(...ips, 1.0);
    let mn = Math.min(...ips, -1.0);
    const range = mx - mn;
    return {
      maxIP: mx + 0.05 * range,
      minIP: mn - 0.05 * range,
    };
  }, [ips]);

  const plotX = (tVal: number) => 35 + (tVal / (2 * Math.PI)) * 340;
  const plotY = (ipVal: number) => 105 - ((ipVal - minIP) / (maxIP - minIP)) * 85;

  const ipPathD = useMemo(() => {
    return curveData.map((d, idx) => `${idx === 0 ? "M" : "L"} ${plotX(d.t)},${plotY(d.ip)}`).join(" ");
  }, [curveData, maxIP, minIP]);

  // Circular gauge for Winding Number Dial
  const windingAngle = p.cumulativeW * 2 * Math.PI;
  const needleX = 80 + 52 * Math.sin(windingAngle);
  const needleY = 80 - 52 * Math.cos(windingAngle);

  // Translations object
  const dict = {
    en: {
      title: "Parametric Winding & Vector Projections",
      subtitle: "The Inner Product Engine of Topological Invariance",
      selectCurve: "Select Parameterized Curve:",
      curveCircle: "Centered Circle (W = 1)",
      curveShiftedCircle: "Shifted Circle (W = 0)",
      curveLimacon: "Self-Intersecting Limaçon",
      curveEpitrochoid: "Self-Looping Epitrochoid",
      curveClover: "Triple Clover Leaf",
      play: "Play",
      pause: "Pause",
      reset: "Reset",
      speed: "Speed",
      grid: "Grid",
      vectors: "Vectors",
      wedge: "Wedge",
      telemetry: "Real-time Telemetry & Invariant Checks",
      innerProductTitle: "Angular Momentum Numerator",
      cumulativeWinding: "Cumulative Winding Gauge",
      posVector: "Position Vector",
      perpVector: "CCW Rotated Target",
      velVector: "Velocity Vector",
      innerProductVal: "Inner Product",
      angleLabel: "Angular Relation",
      acute: "Acute (< 90°): Adding CCW rotation",
      obtuse: "Obtuse (> 90°): Adding CW backtracking",
      originAlert: "Origin is safe",
      originPassed: "Origin in path! Winding not strictly defined",
      explanation: "Rigorous Mathematical Proof",
      expIntro: "To compute the winding number of a closed curve around the origin, we integrate the instantaneous angular velocity:",
      expIntegral: "W(2\\pi) = \\frac{1}{2\\pi} \\int_{0}^{2\\pi} \\omega(t) \\, dt = \\frac{1}{2\\pi} \\int_{0}^{2\\pi} \\frac{x(t)y'(t) - y(t)x'(t)}{x(t)^2 + y(t)^2} \\, dt",
      expInnerProduct: "The numerator is exactly the inner product of the velocity vector and the 90° CCW rotated position vector:",
      expFormula: "\\langle \\vec{v}(t), \\vec{r}(t)^\\perp \\rangle = \\langle (x'(t), y'(t)), (-y(t), x(t)) \\rangle = x(t)y'(t) - y(t)x'(t)",
      expCorollary: "Theorem of Strict Positivity",
      expTheorem: "If the angle between the velocity vector and the rotated position is always acute, the inner product remains strictly positive:",
      expEquation: "\\langle \\vec{v}(t), \\vec{r}(t)^\\perp \\rangle > 0 \\quad \\forall t \\in [0, 2\\pi]",
      expConclusion: "This guarantees that the angular velocity is strictly positive everywhere. The curve always rotates in the positive direction and never backtracks or stops. Therefore, the winding number is strictly positive (W ≥ 1), proving that the origin lies inside the curve's interior. In the Fundamental Theorem of Algebra, this strict positivity ensures that when we grow a boundary, we trap roots inside, guaranteeing their existence!",
      vectorDiagram: "Vector Mechanics Diagram"
    },
    pt: {
      title: "Winding Paramétrico e Projeções Vetoriais",
      subtitle: "O Motor de Produto Interno da Invariância Topológica",
      selectCurve: "Selecione a Curva Parametrizada:",
      curveCircle: "Círculo Centrado (W = 1)",
      curveShiftedCircle: "Círculo Deslocado (W = 0)",
      curveLimacon: "Limaçon com Auto-interseção",
      curveEpitrochoid: "Epitrocoide com Laços",
      curveClover: "Trevo de Três Folhas",
      play: "Iniciar",
      pause: "Pausar",
      reset: "Reiniciar",
      speed: "Velocidade",
      grid: "Grade",
      vectors: "Vetores",
      wedge: "Ângulo",
      telemetry: "Telemetria em Tempo Real e Checagem de Invariantes",
      innerProductTitle: "Numerador do Momentum Angular",
      cumulativeWinding: "Indicador de Voltas Acumuladas",
      posVector: "Vetor de Posição",
      perpVector: "Alvo Rotacionado 90°",
      velVector: "Vetor de Velocidade",
      innerProductVal: "Produto Interno",
      angleLabel: "Relação Angular",
      acute: "Agudo (< 90°): Rotação anti-horária positiva",
      obtuse: "Obtuso (> 90°): Retorno horário negativo",
      originAlert: "Origem preservada",
      originPassed: "Origem interceptada! Winding não definido",
      explanation: "Demonstração Matemática Rigorosa",
      expIntro: "Para calcular o número de voltas de uma curva fechada ao redor da origem, integramos a velocidade angular instantânea:",
      expIntegral: "W(2\\pi) = \\frac{1}{2\\pi} \\int_{0}^{2\\pi} \\omega(t) \\, dt = \\frac{1}{2\\pi} \\int_{0}^{2\\pi} \\frac{x(t)y'(t) - y(t)x'(t)}{x(t)^2 + y(t)^2} \\, dt",
      expInnerProduct: "O numerador é exatamente o produto interno entre o vetor velocidade e o vetor posição rotacionado 90° no sentido anti-horário:",
      expFormula: "\\langle \\vec{v}(t), \\vec{r}(t)^\\perp \\rangle = \\langle (x'(t), y'(t)), (-y(t), x(t)) \\rangle = x(t)y'(t) - y(t)x'(t)",
      expCorollary: "Teorema da Positividade Estrita",
      expTheorem: "Se o ângulo entre a velocidade e o vetor rotacionado for sempre agudo, o produto interno permanece estritamente positivo:",
      expEquation: "\\langle \\vec{v}(t), \\vec{r}(t)^\\perp \\rangle > 0 \\quad \\forall t \\in [0, 2\\pi]",
      expConclusion: "Isso garante que a velocidade angular é estritamente positiva em toda parte. A curva sempre rotaciona na direção positiva e nunca volta ou se anula. Logo, o número de voltas final é estritamente positivo (W ≥ 1), provando que a origem está no interior da curva. No Teorema Fundamental da Álgebra, esta positividade estrita garante que, ao expandir nossa fronteira, aprisionamos raízes no interior, provando matematicamente que elas existem!",
      vectorDiagram: "Diagrama de Mecânica Vetorial"
    }
  };

  const t = isPt ? dict.pt : dict.en;

  return (
    <div className="w-full text-zinc-100 flex flex-col gap-6 select-none">
      {/* Header Panel */}
      <div className="p-5 md:p-6 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl flex flex-col gap-2 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl -z-10" />
        <h1 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-zinc-400 max-w-3xl leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Panel: SVG Vector Canvas */}
        <div className="flex flex-col gap-4 p-5 bg-zinc-950/65 border border-zinc-850 rounded-3xl shadow-lg justify-between">
          <div className="flex flex-col gap-3">
            {/* Curve Selector Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {t.selectCurve}
              </label>
              <select
                value={selectedCurve}
                onChange={(e) => {
                  setSelectedCurve(e.target.value);
                  setStep(0);
                }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 outline-none rounded-xl px-3 py-2 text-sm text-zinc-200 transition-colors"
              >
                <option value="circle">{t.curveCircle}</option>
                <option value="shifted_circle">{t.curveShiftedCircle}</option>
                <option value="limacon">{t.curveLimacon}</option>
                <option value="epitrochoid">{t.curveEpitrochoid}</option>
                <option value="clover">{t.curveClover}</option>
              </select>
            </div>

            {/* SVG Visualizer Canvas */}
            <div className="w-full aspect-square bg-zinc-950 rounded-2xl border border-zinc-900 overflow-hidden relative">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full"
              >
                <defs>
                  <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
                  </marker>
                  <marker id="arrow-dashed-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#60a5fa" />
                  </marker>
                  <marker id="arrow-magenta" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#ec4899" />
                  </marker>
                </defs>

                {/* Gridlines */}
                {showGrid && (
                  <>
                    {/* Horizontal & Vertical grid lines */}
                    {[-3, -2, -1, 1, 2, 3].map((val) => (
                      <React.Fragment key={`grid-${val}`}>
                        <line
                          x1={0}
                          y1={toSVGY(val)}
                          x2={400}
                          y2={toSVGY(val)}
                          className="stroke-zinc-900/60"
                          strokeWidth={1}
                        />
                        <line
                          x1={toSVGX(val)}
                          y1={0}
                          x2={toSVGX(val)}
                          y2={400}
                          className="stroke-zinc-900/60"
                          strokeWidth={1}
                        />
                        {/* Coordinates labels */}
                        <text
                          x={toSVGX(val)}
                          y={toSVGY(-0.08)}
                          className="fill-zinc-600 font-mono text-[9px] text-center"
                          textAnchor="middle"
                        >
                          {val}
                        </text>
                        <text
                          x={toSVGX(0.08)}
                          y={toSVGY(val) + 3}
                          className="fill-zinc-600 font-mono text-[9px]"
                        >
                          {val}
                        </text>
                      </React.Fragment>
                    ))}
                    {/* Primary Axes */}
                    <line x1={0} y1={200} x2={400} y2={200} className="stroke-zinc-700/80" strokeWidth={1.5} />
                    <line x1={200} y1={0} x2={200} y2={400} className="stroke-zinc-700/80" strokeWidth={1.5} />
                    <circle cx={200} cy={200} r={3} className="fill-zinc-400" />
                  </>
                )}

                {/* The parameterized curve, segment-by-segment color coded */}
                {(() => {
                  const segments = [];
                  for (let i = 0; i < curveData.length - 1; i++) {
                    const p1 = curveData[i];
                    const p2 = curveData[i + 1];
                    const ipAvg = (p1.ip + p2.ip) / 2;
                    const isPositive = ipAvg >= 0;
                    segments.push(
                      <line
                        key={`seg-${i}`}
                        x1={toSVGX(p1.x)}
                        y1={toSVGY(p1.y)}
                        x2={toSVGX(p2.x)}
                        y2={toSVGY(p2.y)}
                        className={isPositive ? "stroke-emerald-500" : "stroke-rose-500"}
                        strokeWidth={step > i ? 4.5 : 2.5}
                        strokeLinecap="round"
                        opacity={step > i ? 1 : 0.45}
                      />
                    );
                  }
                  return segments;
                })()}

                {/* Shaded Wedge indicating angle between rotated position vector and velocity vector */}
                {showWedge && showVectors && d > 1e-3 && dv > 1e-3 && (
                  <path
                    d={svgWedgePath}
                    className={p.ip >= 0 ? "fill-emerald-500/20 stroke-emerald-500/40" : "fill-rose-500/20 stroke-rose-500/40"}
                    strokeWidth={1}
                  />
                )}

                {/* Active Vectors */}
                {showVectors && (
                  <>
                    {/* Blue Position Vector r(t) */}
                    <line
                      x1={200}
                      y1={200}
                      x2={toSVGX(p.x)}
                      y2={toSVGY(p.y)}
                      className="stroke-blue-500"
                      strokeWidth={2.5}
                      markerEnd="url(#arrow-blue)"
                    />

                    {/* Light Blue Dashed Perpendicular r^\perp(t) starting at curve point */}
                    {d > 1e-3 && (
                      <line
                        x1={toSVGX(p.x)}
                        y1={toSVGY(p.y)}
                        x2={toSVGX(rxEnd.x)}
                        y2={toSVGY(rxEnd.y)}
                        className="stroke-blue-400"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        markerEnd="url(#arrow-dashed-blue)"
                      />
                    )}

                    {/* Magenta Velocity Vector v(t) starting at curve point */}
                    {dv > 1e-3 && (
                      <line
                        x1={toSVGX(p.x)}
                        y1={toSVGY(p.y)}
                        x2={toSVGX(vxEnd.x)}
                        y2={toSVGY(vxEnd.y)}
                        className="stroke-pink-500"
                        strokeWidth={2.5}
                        markerEnd="url(#arrow-magenta)"
                      />
                    )}

                    {/* Highlighted current position dot */}
                    <circle
                      cx={toSVGX(p.x)}
                      cy={toSVGY(p.y)}
                      r={5.5}
                      className={p.ip >= 0 ? "fill-emerald-400 stroke-zinc-950" : "fill-rose-400 stroke-zinc-950"}
                      strokeWidth={1.5}
                    />
                  </>
                )}
              </svg>

              {/* Angle Readout Overlay */}
              <div className="absolute bottom-3 left-3 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-mono flex flex-col gap-0.5">
                <span className="text-zinc-500">t = {(p.t / Math.PI).toFixed(2)}π rad</span>
                <span className="text-zinc-300">
                  {t.innerProductVal}:{" "}
                  <span className={p.ip >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {p.ip >= 0 ? "+" : ""}
                    {p.ip.toFixed(3)}
                  </span>
                </span>
                <span className="text-zinc-400">
                  θ = {Math.abs(angleInfo.deltaDeg).toFixed(1)}° (
                  <span className={p.ip >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {p.ip >= 0 ? "Agudo" : "Obtuso"}
                  </span>
                  )
                </span>
              </div>
            </div>
          </div>

          {/* Time Scrubber Controls */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-3">
              {/* Play/Pause Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-xl transition-all font-semibold flex items-center justify-center border ${
                  isPlaying
                    ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                }`}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <rect x="5" y="4" width="4" height="16" rx="1" />
                    <rect x="15" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setStep(0);
                }}
                className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/85 text-zinc-300 rounded-xl transition-colors"
                title={t.reset}
              >
                <svg className="w-4 h-4 stroke-current fill-none" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>

              {/* Time Scrubber Slider */}
              <input
                type="range"
                min="0"
                max={totalSteps}
                value={step}
                onChange={(e) => {
                  setIsPlaying(false);
                  setStep(parseInt(e.target.value));
                }}
                className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Control Checkboxes & Speed Selection */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.speed}</span>
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 self-start">
                  {[0.5, 1, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlaySpeed(s)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors ${
                        playSpeed === s ? "bg-emerald-500/25 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 justify-end items-center">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  {t.grid}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={showVectors}
                    onChange={(e) => setShowVectors(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  {t.vectors}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={showWedge}
                    onChange={(e) => setShowWedge(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  {t.wedge}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Telemetry Plots & Circular Dial */}
        <div className="flex flex-col gap-6 p-5 bg-zinc-950/65 border border-zinc-850 rounded-3xl shadow-lg justify-between">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-2">
            {t.telemetry}
          </h2>

          {/* Real-time Inner Product Graph */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-zinc-300">{t.innerProductTitle}</span>
              <span className="font-mono text-zinc-500">
                min: {minIP.toFixed(2)} | max: {maxIP.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-[125px] bg-zinc-950 rounded-2xl border border-zinc-900 overflow-hidden relative">
              <svg className="w-full h-full">
                {/* Horizontal reference axis at IP = 0 */}
                {minIP < 0 && maxIP > 0 && (
                  <line
                    x1={35}
                    y1={plotY(0)}
                    x2={375}
                    y2={plotY(0)}
                    className="stroke-zinc-700"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                {/* X Axis ticks */}
                {[0, Math.PI, 2 * Math.PI].map((val, idx) => {
                  const tickLabels = ["0", "π", "2π"];
                  return (
                    <text
                      key={`xtick-${idx}`}
                      x={plotX(val)}
                      y={120}
                      className="fill-zinc-600 font-mono text-[9px] text-center"
                      textAnchor="middle"
                    >
                      {tickLabels[idx]}
                    </text>
                  );
                })}

                {/* Y Axis bounds labels */}
                <text x={8} y={20} className="fill-zinc-600 font-mono text-[9px]">
                  {maxIP.toFixed(1)}
                </text>
                <text x={8} y={105} className="fill-zinc-600 font-mono text-[9px]">
                  {minIP.toFixed(1)}
                </text>

                {/* Shading zones: Green above 0, Red below 0 */}
                {minIP < 0 && maxIP > 0 && (
                  <rect
                    x={35}
                    y={10}
                    width={340}
                    height={plotY(0) - 10}
                    className="fill-emerald-500/2"
                  />
                )}
                {minIP < 0 && maxIP > 0 && (
                  <rect
                    x={35}
                    y={plotY(0)}
                    width={340}
                    height={110 - plotY(0)}
                    className="fill-rose-500/2"
                  />
                )}

                {/* Core Inner Product Path line */}
                <path d={ipPathD} fill="none" className="stroke-zinc-500" strokeWidth={2} />

                {/* Left bounds line */}
                <line x1={35} y1={10} x2={35} y2={110} className="stroke-zinc-800" strokeWidth={1} />

                {/* Scrubber tracker lines */}
                <line x1={plotX(p.t)} y1={10} x2={plotX(p.t)} y2={110} className="stroke-blue-500" strokeWidth={1.5} />
                <circle cx={plotX(p.t)} cy={plotY(p.ip)} r={4} className="fill-blue-400 stroke-zinc-950" strokeWidth={1.5} />
              </svg>
            </div>
          </div>

          {/* Winding dial & Legends */}
          <div className="grid grid-cols-5 gap-4 items-center mt-2">
            {/* Winding Circular Dial Gauge */}
            <div className="col-span-2 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                {t.cumulativeWinding}
              </span>
              <div className="w-32 h-32 bg-zinc-950 border border-zinc-900 rounded-full relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full">
                  {/* Gauge background arc */}
                  <circle
                    cx={64}
                    cy={64}
                    r={45}
                    fill="none"
                    className="stroke-zinc-900"
                    strokeWidth={8}
                  />

                  {/* Active circular progress path */}
                  <circle
                    cx={64}
                    cy={64}
                    r={45}
                    fill="none"
                    className={p.cumulativeW >= 0 ? "stroke-emerald-500/20" : "stroke-rose-500/20"}
                    strokeWidth={8}
                  />

                  {/* Needle Pivot Center */}
                  <circle cx={64} cy={64} r={6} className="fill-zinc-600 stroke-zinc-950" strokeWidth={1} />

                  {/* Needle line */}
                  <line
                    x1={64}
                    y1={64}
                    x2={64 + 40 * Math.sin(windingAngle)}
                    y2={64 - 40 * Math.cos(windingAngle)}
                    className={p.ip >= 0 ? "stroke-emerald-400" : "stroke-rose-400"}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Internal Digital Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                  <span className="text-lg font-black font-mono leading-none">
                    {p.cumulativeW.toFixed(2)}
                  </span>
                  <span className="text-[8px] uppercase text-zinc-500 font-bold tracking-widest mt-0.5">
                    {isPt ? "Voltas" : "Turns"}
                  </span>
                </div>
              </div>
            </div>

            {/* Vector Legend and Status check */}
            <div className="col-span-3 flex flex-col gap-3">
              {/* Legend rows */}
              <div className="flex flex-col gap-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>
                    <strong>{t.posVector}:</strong> <InlineMath math="\vec{r}(t)" />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-1.5 bg-blue-400 border border-dashed border-zinc-950 rounded-full" />
                  <span>
                    <strong>{t.perpVector}:</strong> <InlineMath math="\vec{r}(t)^\perp" />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-1.5 bg-pink-500 rounded-full" />
                  <span>
                    <strong>{t.velVector}:</strong> <InlineMath math="\vec{v}(t)" />
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex flex-col gap-1 text-[11px] border-t border-zinc-850 pt-2.5">
                <div className="font-bold text-zinc-500 uppercase tracking-widest">{t.angleLabel}:</div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${p.ip >= 0 ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"}`} />
                  <span className={p.ip >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                    {p.ip >= 0 ? t.acute : t.obtuse}
                  </span>
                </div>
                {/* Check if origin is passed */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${d < 1e-2 ? "bg-amber-500 animate-ping" : "bg-emerald-500/20"}`} />
                  <span className={d < 1e-2 ? "text-amber-400 font-bold" : "text-zinc-500 font-mono"}>
                    {d < 1e-2 ? t.originPassed : t.originAlert}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanations Section */}
      <div className="p-6 bg-zinc-950 border border-zinc-850 rounded-3xl shadow-xl flex flex-col gap-4">
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-850 pb-2 flex items-center gap-2">
          <svg className="w-4 h-4 fill-emerald-400" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          {t.explanation}
        </h2>

        <div className="text-xs md:text-sm text-zinc-400 leading-relaxed flex flex-col gap-4">
          <p>{t.expIntro}</p>
          <div className="overflow-x-auto py-2 bg-zinc-900/50 border border-zinc-900 rounded-xl px-4 my-1">
            <BlockMath math={t.expIntegral} />
          </div>

          <p>{t.expInnerProduct}</p>
          <div className="overflow-x-auto py-2 bg-zinc-900/50 border border-zinc-900 rounded-xl px-4 my-1">
            <BlockMath math={t.expFormula} />
          </div>

          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-2">
            {t.expCorollary}
          </h3>
          <p>{t.expTheorem}</p>
          <div className="overflow-x-auto py-2 bg-zinc-900/50 border border-zinc-900 rounded-xl px-4 my-1">
            <BlockMath math={t.expEquation} />
          </div>
          <p className="text-zinc-300 font-medium bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
            {t.expConclusion}
          </p>

          {/* Symmetrical Diagrams Section (ASCII + Mermaid) */}
          <div className="mt-4 border-t border-zinc-850 pt-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
              {t.vectorDiagram}
            </h3>

            {/* Side-by-side or stacked diagrams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ASCII Diagram */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl font-mono text-[10px] md:text-xs overflow-x-auto whitespace-pre leading-none text-zinc-400">
{`                        ^  Rotated Position r^perp (90 deg CCW)
                        |  [Positive winding direction]
                        |
                        + - - - - - - - - > Velocity vector v(t)
                       . \\             . /
                      .   \\  Angle theta/
                     .     \\         . /
                    .       \\       . /
                   .         \\     . /
                  .         \\   . /
                 .           \\ . /
                .             + Curve point gamma(t)
               .             /
              .             /
             .             /  Position Vector r(t)
            .             /
           .             /
          .             /
         .             v
                      Origin (0,0)`}
              </div>

              {/* Mermaid Visual block */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 min-h-[150px]">
                <div className="w-full text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                  Mermaid Topological Invariant Map
                </div>
                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-900 shadow-inner w-full flex justify-center">
                  <div className="text-xs text-zinc-300">
                    <pre className="text-zinc-400 text-[11px] font-mono leading-tight">
{`graph TD
  Origin[Origin 0,0] -->|Position r| Point[Curve Point]
  Point -->|Rotated r^perp| Perp[CCW Rotation]
  Point -->|Velocity v| Vel[Velocity Vector]`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
