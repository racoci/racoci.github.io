"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

export default function MappingVisualizer() {
  const coeffs = usePolynomial();
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(80);

  const R = 1.2;
  const segments = 16;
  
  const zPoints = useMemo(() => {
    const pts: Complex[] = [];
    for (let i = 0; i < segments; i++) pts.push({ re: R, im: -R + (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: R - (i / segments) * 2 * R, im: R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R, im: R - (i / segments) * 2 * R });
    for (let i = 0; i < segments; i++) pts.push({ re: -R + (i / segments) * 2 * R, im: -R });
    pts.push({ re: R, im: -R });
    return pts;
  }, [R]);

  const pPoints = useMemo(() => {
    return zPoints.map(z => evaluatePolynomial(coeffs, z));
  }, [zPoints, coeffs]);

  const activeZ = zPoints[step] || { re: R, im: -R };
  const activeP = pPoints[step] || { re: 0, im: 0 };

  const getQuadrant = (x: number, y: number): number => {
    if (x >= 0 && y >= 0) return 0;
    if (x < 0 && y >= 0) return 1;
    if (x < 0 && y < 0) return 2;
    return 3;
  };

  const activeZQuad = getQuadrant(activeZ.re, activeZ.im);
  const activePQuad = getQuadrant(activeP.re, activeP.im);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % (segments * 4));
    }, speed);
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const width = 280;
  const height = 280;

  // Auto-fit bounding box for P(z)
  const defaultPViewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pPoints.forEach(p => {
      if (p.re < minX) minX = p.re;
      if (p.re > maxX) maxX = p.re;
      if (p.im < minY) minY = p.im;
      if (p.im > maxY) maxY = p.im;
    });
    // Include origin
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;
    
    let w = Math.max(maxX - minX, maxY - minY);
    if (w === 0) w = 2; // fallback
    w *= 1.4; // padding
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    return {
      x: cx - w / 2,
      y: cy - w / 2,
      w: w,
      h: w
    };
  }, [pPoints]);

  const [pViewBox, setPViewBox] = useState(defaultPViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Update viewbox if it hasn't been explicitly panned recently, or just auto-update it on polynomial change
  useEffect(() => {
    setPViewBox(defaultPViewBox);
  }, [defaultPViewBox]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    
    // Scale pixel movement to SVG coordinate movement
    const viewBoxDx = (dx / width) * pViewBox.w;
    const viewBoxDy = (dy / height) * pViewBox.h;
    
    setPViewBox(prev => ({
      ...prev,
      x: prev.x - viewBoxDx,
      y: prev.y + viewBoxDy // Y axis is flipped in complex plane visually, but SVG coordinates go down
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    
    // Zoom towards center of viewBox for simplicity
    setPViewBox(prev => {
      const newW = prev.w * zoomFactor;
      const newH = prev.h * zoomFactor;
      return {
        x: prev.x + (prev.w - newW) / 2,
        y: prev.y + (prev.h - newH) / 2,
        w: newW,
        h: newH
      };
    });
  };

  // Convert logical coordinates to Z-plane SVG coordinates (fixed scale)
  const zScale = 80;
  const zCx = width / 2;
  const zCy = height / 2;
  const toZSVG = (c: Complex) => [zCx + c.re * zScale, zCy - c.im * zScale];

  // Convert logical coordinates to P-plane SVG coordinates (dynamic scale based on viewBox)
  const pScale = width / pViewBox.w;
  const toPSVG = (c: Complex) => {
    const screenX = (c.re - pViewBox.x) * pScale;
    // Y is inverted in complex plane vs SVG
    const screenY = height - (c.im - pViewBox.y) * pScale;
    return [screenX, screenY];
  };

  const polylineZPath = zPoints.map(p => toZSVG(p).join(",")).join(" ");
  const polylinePPath = pPoints.map(p => toPSVG(p).join(",")).join(" ");

  const zPathCoords = zPoints.map(toZSVG);
  const pPathCoords = pPoints.map(toPSVG);

  const formatCoord = (val: number) => val.toFixed(2);

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
            Visualize how points along the square boundary map through the polynomial.
            Notice how the mapped curve winds around the origin based on the roots inside.
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
              setPViewBox(defaultPViewBox);
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
            <tspan fontStyle="italic">z</tspan>-plane (Domain Boundary)
          </div>
          <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-2 shadow-inner">
            <svg width={width} height={height} className="overflow-visible">
              <rect x={zCx} y={0} width={zCx} height={zCy} fill="rgba(16, 185, 129, 0.03)" />
              <rect x={0} y={0} width={zCx} height={zCy} fill="rgba(245, 158, 11, 0.03)" />
              <rect x={0} y={zCy} width={zCx} height={zCy} fill="rgba(244, 63, 94, 0.03)" />
              <rect x={zCx} y={zCy} width={zCx} height={zCy} fill="rgba(59, 130, 246, 0.03)" />

              <line x1={0} y1={zCy} x2={width} y2={zCy} stroke="#27272a" strokeWidth={1} />
              <line x1={zCx} y1={0} x2={zCx} y2={height} stroke="#27272a" strokeWidth={1} />
              <circle cx={zCx} cy={zCy} r={zScale} fill="none" stroke="#27272a" strokeDasharray="3 3" />
              <circle cx={zCx} cy={zCy} r={zScale * R} fill="none" stroke="#27272a" strokeWidth={0.5} strokeDasharray="5 5" />

              <rect
                x={zCx - R * zScale}
                y={zCy - R * zScale}
                width={2 * R * zScale}
                height={2 * R * zScale}
                fill="none"
                stroke="#3f3f46"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              <polyline
                points={polylineZPath}
                fill="none"
                stroke="#52525b"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

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

              <circle cx={zCx} cy={zCy} r={3} fill="#a1a1aa" />

              {(() => {
                const [sx, sy] = toZSVG(activeZ);
                return <line x1={zCx} y1={zCy} x2={sx} y2={sy} stroke="rgba(16, 185, 129, 0.4)" strokeWidth={1} strokeDasharray="2 2" />;
              })()}

              <text x={width - 25} y={25} fill="#10b981" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q0</text>
              <text x={25} y={25} fill="#f59e0b" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q1</text>
              <text x={25} y={height - 15} fill="#f43f5e" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q2</text>
              <text x={width - 25} y={height - 15} fill="#3b82f6" fillOpacity={0.4} fontSize={10} fontFamily="monospace" textAnchor="middle">Q3</text>
            </svg>
          </div>
          <div className="mt-3 text-xs font-mono text-zinc-400">
            <span className="italic">z</span> = {formatCoord(activeZ.re)} {activeZ.im >= 0 ? "+" : ""}{formatCoord(activeZ.im)}i (Quadrant Q{activeZQuad})
          </div>
        </div>

        {/* P(Z) PLANE */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono font-bold text-zinc-400 mb-2 flex items-center justify-between w-full">
            <span><span className="italic">P(z)</span>-plane (Mapped Image)</span>
            <span className="text-[10px] text-zinc-500 font-normal">Pan & Zoom</span>
          </div>
          <div className="relative border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/80 p-2 shadow-inner cursor-grab active:cursor-grabbing touch-none">
            <svg 
              width={width} 
              height={height} 
              className="overflow-visible"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* Dynamic Grid / Background based on viewbox can be tricky, let's keep it relative to SVG coordinates */}
              {(() => {
                const origin = toPSVG({re: 0, im: 0});
                return (
                  <>
                    <rect x={origin[0]} y={0} width={width - origin[0]} height={origin[1]} fill="rgba(16, 185, 129, 0.03)" clipPath={`url(#bounds)`} />
                    <rect x={0} y={0} width={origin[0]} height={origin[1]} fill="rgba(245, 158, 11, 0.03)" clipPath={`url(#bounds)`} />
                    <rect x={0} y={origin[1]} width={origin[0]} height={height - origin[1]} fill="rgba(244, 63, 94, 0.03)" clipPath={`url(#bounds)`} />
                    <rect x={origin[0]} y={origin[1]} width={width - origin[0]} height={height - origin[1]} fill="rgba(59, 130, 246, 0.03)" clipPath={`url(#bounds)`} />
                    
                    <line x1={0} y1={origin[1]} x2={width} y2={origin[1]} stroke="#27272a" strokeWidth={1} />
                    <line x1={origin[0]} y1={0} x2={origin[0]} y2={height} stroke="#27272a" strokeWidth={1} />
                  </>
                );
              })()}
              
              <defs>
                <clipPath id="bounds">
                  <rect x="0" y="0" width={width} height={height} />
                </clipPath>
              </defs>

              <polyline
                points={polylinePPath}
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.7}
              />

              {pPathCoords.map(([px, py], idx) => (
                <circle
                  key={idx}
                  cx={px}
                  cy={py}
                  r={idx === step ? 5.5 : 2.5}
                  fill={idx === step ? "#34d399" : "rgba(16, 185, 129, 0.55)"}
                  className="transition-all duration-100"
                />
              ))}

              {(() => {
                const origin = toPSVG({re: 0, im: 0});
                return (
                  <>
                    <circle cx={origin[0]} cy={origin[1]} r={5} fill="#f43f5e" />
                    <circle cx={origin[0]} cy={origin[1]} r={8} fill="none" stroke="#f43f5e" strokeWidth={1} strokeDasharray="2 2" className="animate-pulse" />
                  </>
                );
              })()}

              {(() => {
                const [sx, sy] = toPSVG(activeP);
                const origin = toPSVG({re: 0, im: 0});
                return <line x1={origin[0]} y1={origin[1]} x2={sx} y2={sy} stroke="rgba(244, 63, 94, 0.4)" strokeWidth={1.2} strokeDasharray="2 2" />;
              })()}
            </svg>
          </div>
          <div className="mt-3 text-xs font-mono text-emerald-400">
            <span className="italic">P(z)</span> = {formatCoord(activeP.re)} {activeP.im >= 0 ? "+" : ""}{formatCoord(activeP.im)}i (Quadrant Q{activePQuad})
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 mt-6 pt-5">
        <div className="flex flex-col gap-4">
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
      </div>
    </div>
  );
}
