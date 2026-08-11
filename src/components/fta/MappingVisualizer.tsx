"use client";

import React, { useState, useEffect, useMemo } from "react";

export default function MappingVisualizer() {
  const [degree, setDegree] = useState<number>(3);
  const [offsetR, setOffsetR] = useState<number>(0.2);
  const [offsetI, setOffsetI] = useState<number>(0.15);
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(80); // ms per step

  const R = 1.2; // radius of boundary
  const segments = 16; // points per side of square -> 64 points total
  
  // Generate boundary points on square in z-plane
  const zPoints = useMemo(() => {
    const pts: [number, number][] = [];
    
    // Side 1: from (R, -R) to (R, R)
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      pts.push([R, -R + t * 2 * R]);
    }
    // Side 2: from (R, R) to (-R, R)
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      pts.push([R - t * 2 * R, R]);
    }
    // Side 3: from (-R, R) to (-R, -R)
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      pts.push([-R, R - t * 2 * R]);
    }
    // Side 4: from (-R, -R) to (R, -R)
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      pts.push([-R + t * 2 * R, -R]);
    }
    // Close the loop
    pts.push([R, -R]);
    return pts;
  }, [R]);

  // Complex arithmetic: z^d
  const power = (x: number, y: number, d: number): [number, number] => {
    const r = Math.sqrt(x * x + y * y);
    const theta = Math.atan2(y, x);
    const rd = Math.pow(r, d);
    const thetaD = theta * d;
    return [rd * Math.cos(thetaD), rd * Math.sin(thetaD)];
  };

  // Polynomial mapping: P(z) = z^d - c
  const pPoints = useMemo(() => {
    return zPoints.map(([x, y]) => {
      const [px, py] = power(x, y, degree);
      return [px - offsetR, py - offsetI] as [number, number];
    });
  }, [zPoints, degree, offsetR, offsetI]);

  // Current active points
  const activeZ = zPoints[step] || [R, -R];
  const activeP = pPoints[step] || [0, 0];

  // Quadrant checker (0 to 3)
  const getQuadrant = (x: number, y: number): number => {
    if (x >= 0 && y >= 0) return 0;
    if (x < 0 && y >= 0) return 1;
    if (x < 0 && y < 0) return 2;
    return 3;
  };

  const activeZQuad = getQuadrant(activeZ[0], activeZ[1]);
  const activePQuad = getQuadrant(activeP[0], activeP[1]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % (segments * 4));
    }, speed);
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  // SVG drawing utilities
  const width = 280;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2;
  const scale = 80; // pixels per unit

  const toSVG = (x: number, y: number) => {
    return [cx + x * scale, cy - y * scale];
  };

  const polylineZPath = zPoints.map(([x, y]) => toSVG(x, y).join(",")).join(" ");
  const polylinePPath = pPoints.map(([x, y]) => toSVG(x, y).join(",")).join(" ");

  const zPathCoords = zPoints.map(([x, y]) => toSVG(x, y));
  const pPathCoords = pPoints.map(([x, y]) => toSVG(x, y));

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-8 shadow-2xl shadow-emerald-950/20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-1 rounded-full">
            Playground 1: Complex Mapping
          </span>
          <h3 className="text-xl font-bold text-zinc-100 mt-2 font-sans">
            Discrete Quad-Boundary Mapping
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Visualize how points $z$ along the square boundary $\partial Q_0$ map through $P(z) = z^d - c$. Notice how the mapped curve winds around the origin exactly $d$ times.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
              isPlaying
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center">
        {/* Z PLANE */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono font-bold text-zinc-400 mb-2">
            $z$-plane (Domain Boundary)
          </div>
          <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-2 shadow-inner">
            <svg width={width} height={height} className="overflow-visible">
              {/* Quadrant backgrounds */}
              <rect x={cx} y={0} width={cx} height={cy} fill="rgba(16, 185, 129, 0.03)" /> {/* Q0 */}
              <rect x={0} y={0} width={cx} height={cy} fill="rgba(245, 158, 11, 0.03)" /> {/* Q1 */}
              <rect x={0} y={cy} width={cx} height={cy} fill="rgba(244, 63, 94, 0.03)" />  {/* Q2 */}
              <rect x={cx} y={cy} width={cx} height={cy} fill="rgba(59, 130, 246, 0.03)" /> {/* Q3 */}

              {/* Grid Lines */}
              <line x1={0} y1={cy} x2={width} y2={cy} stroke="#27272a" strokeWidth={1} />
              <line x1={cx} y1={0} x2={cx} y2={height} stroke="#27272a" strokeWidth={1} />
              <circle cx={cx} cy={cy} r={scale} fill="none" stroke="#27272a" strokeDasharray="3 3" />
              <circle cx={cx} cy={cy} r={scale * R} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="5 5" />

              {/* Boundary representation */}
              <rect
                x={cx - R * scale}
                y={cy - R * scale}
                width={2 * R * scale}
                height={2 * R * scale}
                fill="none"
                stroke="#3f3f46"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {/* Segment line connectors */}
              <polyline
                points={polylineZPath}
                fill="none"
                stroke="#52525b"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Plot individual points */}
              {zPathCoords.map(([px, py], idx) => (
                <circle
                  key={idx}
                  cx={px}
                  cy={py}
                  r={idx === step ? 4.5 : 2}
                  fill={idx === step ? "#10b981" : "#52525b"}
                  className="transition-all duration-100"
                />
              ))}

              {/* Origin indicator */}
              <circle cx={cx} cy={cy} r={3} fill="#a1a1aa" />

              {/* Active Trace Line to Origin */}
              {(() => {
                const [sx, sy] = toSVG(activeZ[0], activeZ[1]);
                return (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={sx}
                    y2={sy}
                    stroke="rgba(16, 185, 129, 0.4)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                );
              })()}

              {/* Quadrant Labels */}
              <text x={width - 25} y={25} fill="#10b981" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q0</text>
              <text x={25} y={25} fill="#f59e0b" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q1</text>
              <text x={25} y={height - 15} fill="#f43f5e" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q2</text>
              <text x={width - 25} y={height - 15} fill="#3b82f6" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q3</text>
            </svg>
          </div>
          <div className="mt-3 text-xs font-mono text-zinc-400">
            $z = {activeZ[0].toFixed(2)} + {activeZ[1] >= 0 ? "+" : ""}{activeZ[1].toFixed(2)}i$ (Quadrant Q{activeZQuad})
          </div>
        </div>

        {/* P(Z) PLANE */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono font-bold text-zinc-400 mb-2">
            $P(z)$-plane (Mapped Image)
          </div>
          <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-2 shadow-inner">
            <svg width={width} height={height} className="overflow-visible">
              {/* Quadrant backgrounds */}
              <rect x={cx} y={0} width={cx} height={cy} fill="rgba(16, 185, 129, 0.03)" /> {/* Q0 */}
              <rect x={0} y={0} width={cx} height={cy} fill="rgba(245, 158, 11, 0.03)" /> {/* Q1 */}
              <rect x={0} y={cy} width={cx} height={cy} fill="rgba(244, 63, 94, 0.03)" />  {/* Q2 */}
              <rect x={cx} y={cy} width={cx} height={cy} fill="rgba(59, 130, 246, 0.03)" /> {/* Q3 */}

              {/* Grid Lines */}
              <line x1={0} y1={cy} x2={width} y2={cy} stroke="#27272a" strokeWidth={1} />
              <line x1={cx} y1={0} x2={cx} y2={height} stroke="#27272a" strokeWidth={1} />
              <circle cx={cx} cy={cy} r={scale} fill="none" stroke="#27272a" strokeDasharray="3 3" />

              {/* Mapped Curve path */}
              <polyline
                points={polylinePPath}
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.7}
              />

              {/* Plot individual points */}
              {pPathCoords.map(([px, py], idx) => {
                const isSelected = idx === step;
                return (
                  <circle
                    key={idx}
                    cx={px}
                    cy={py}
                    r={isSelected ? 5.5 : 2.5}
                    fill={isSelected ? "#34d399" : "rgba(16, 185, 129, 0.55)"}
                    className="transition-all duration-100"
                  />
                );
              })}

              {/* Origin indicator (MUST NOT be intersected) */}
              <circle cx={cx} cy={cy} r={5} fill="#f43f5e" />
              <circle cx={cx} cy={cy} r={8} fill="none" stroke="#f43f5e" strokeWidth={1} strokeDasharray="2 2" className="animate-pulse" />

              {/* Active Trace Line to Origin */}
              {(() => {
                const [sx, sy] = toSVG(activeP[0], activeP[1]);
                return (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={sx}
                    y2={sy}
                    stroke="rgba(244, 63, 94, 0.4)"
                    strokeWidth={1.2}
                    strokeDasharray="2 2"
                  />
                );
              })()}

              {/* Quadrant Labels */}
              <text x={width - 25} y={25} fill="#10b981" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q0</text>
              <text x={25} y={25} fill="#f59e0b" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q1</text>
              <text x={25} y={height - 15} fill="#f43f5e" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q2</text>
              <text x={width - 25} y={height - 15} fill="#3b82f6" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q3</text>
            </svg>
          </div>
          <div className="mt-3 text-xs font-mono text-emerald-400">
            $P(z) = {activeP[0].toFixed(2)} + {activeP[1] >= 0 ? "+" : ""}{activeP[1].toFixed(2)}i$ (Quadrant Q{activePQuad})
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="border-t border-zinc-800 mt-6 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          {/* Step Tracer */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-zinc-400 font-bold">Mesh Step Tracer (j)</span>
              <span className="text-xs font-mono text-emerald-400">{step} / 63</span>
            </div>
            <input
              type="range"
              min="0"
              max={segments * 4 - 1}
              value={step}
              onChange={(e) => {
                setStep(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-emerald-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Animation Speed */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-zinc-400 font-bold">Trace Sweep Speed</span>
              <span className="text-xs font-mono text-zinc-400">{Math.round(1000 / speed)} steps/sec</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={220 - speed}
              onChange={(e) => setSpeed(220 - parseInt(e.target.value))}
              className="w-full accent-emerald-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Degree Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-mono text-zinc-400 font-bold">Polynomial Degree (d)</span>
              <span className="text-xs font-mono text-emerald-400">d = {degree} (Winding Number = {degree})</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setDegree(d)}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
                    degree === d
                      ? "bg-emerald-500 text-zinc-950 font-bold border border-emerald-400"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-850"
                  }`}
                >
                  z^{d}
                </button>
              ))}
            </div>
          </div>

          {/* Offset c Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-mono text-zinc-400 font-bold">Offset Real (c_r)</span>
                <span className="text-[11px] font-mono text-emerald-400">{offsetR.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.8"
                max="0.8"
                step="0.05"
                value={offsetR}
                onChange={(e) => setOffsetR(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-mono text-zinc-400 font-bold">Offset Imag (c_i)</span>
                <span className="text-[11px] font-mono text-emerald-400">{offsetI.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.8"
                max="0.8"
                step="0.05"
                value={offsetI}
                onChange={(e) => setOffsetI(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
