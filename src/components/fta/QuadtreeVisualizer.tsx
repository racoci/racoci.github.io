"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial } from "./store";

type Box = { x: number; y: number; size: number };

export default function QuadtreeVisualizer() {
  const coeffs = usePolynomial();
  
  // Compute degree
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

  const [target, setTarget] = useState<{ x: number; y: number }>({ x: 210, y: 85 });
  const [depth, setDepth] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const maxDepth = 8;
  const rootSize = 300;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setDepth((prev) => {
        if (prev >= maxDepth) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const { discarded, active } = useMemo(() => {
    const discardedBoxes: Box[] = [];
    let currentActive: Box = { x: 0, y: 0, size: rootSize };

    for (let n = 1; n <= depth; n++) {
      const half = currentActive.size / 2;
      const boxes: Box[] = [
        { x: currentActive.x, y: currentActive.y, size: half }, // TL
        { x: currentActive.x + half, y: currentActive.y, size: half }, // TR
        { x: currentActive.x, y: currentActive.y + half, size: half }, // BL
        { x: currentActive.x + half, y: currentActive.y + half, size: half }, // BR
      ];

      let newActive: Box | null = null;
      for (const b of boxes) {
        // Strict boundary check
        if (
          target.x >= b.x &&
          target.x <= b.x + b.size &&
          target.y >= b.y &&
          target.y <= b.y + b.size
        ) {
          // If perfectly on a boundary, the first one encountered takes it (Deterministic Selection)
          if (!newActive) newActive = b;
          else discardedBoxes.push(b);
        } else {
          discardedBoxes.push(b);
        }
      }

      if (!newActive) newActive = boxes[0]; // fallback
      currentActive = newActive;
    }

    return { discarded: discardedBoxes, active: currentActive };
  }, [target, depth]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTarget({ x, y });
    setDepth(0);
    setIsPlaying(true);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return; // Only if mouse is pressed
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.max(0, Math.min(rootSize, x));
    y = Math.max(0, Math.min(rootSize, y));
    setTarget({ x, y });
    setDepth(0);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-8 shadow-2xl shadow-emerald-950/20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-rose-400 font-mono bg-rose-950/40 border border-rose-800/30 px-2.5 py-1 rounded-full">
            Playground 3: Search Algorithm
          </span>
          <h3 className="text-xl font-bold text-zinc-100 mt-2 font-sans">
            Quadtree Root Isolation
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Click and drag on the domain to place a pseudo-root. Watch how the deterministic bisection algorithm systematically discards regions with <span className="font-serif italic">{"\\Delta=0"}</span> and hones in on the target for a polynomial of degree {degree}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (depth >= maxDepth) setDepth(0);
              setIsPlaying(!isPlaying);
            }}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
              isPlaying
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>
          <button
            onClick={() => {
              setDepth(0);
              setIsPlaying(false);
            }}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all font-mono text-xs"
          >
            RESET
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
        {/* INTERACTIVE CANVAS */}
        <div className="flex-shrink-0 relative border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50 shadow-inner group">
          <svg
            width={rootSize}
            height={rootSize}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            className="cursor-crosshair touch-none"
          >
            {/* Base Domain */}
            <rect x={0} y={0} width={rootSize} height={rootSize} fill="#18181b" />

            {/* Discarded Boxes */}
            {discarded.map((b, i) => (
              <rect
                key={`discarded-${i}`}
                x={b.x}
                y={b.y}
                width={b.size}
                height={b.size}
                fill="rgba(0, 0, 0, 0.4)"
                stroke="#3f3f46"
                strokeWidth={1}
                className="animate-in fade-in duration-300"
              />
            ))}

            {/* Active Box */}
            <rect
              x={active.x}
              y={active.y}
              width={active.size}
              height={active.size}
              fill="rgba(16, 185, 129, 0.15)"
              stroke="#10b981"
              strokeWidth={2}
              className="transition-all duration-300"
            />

            {/* Crosshair grids inside active box to show next potential split */}
            {depth < maxDepth && (
              <g opacity={0.3}>
                <line x1={active.x + active.size / 2} y1={active.y} x2={active.x + active.size / 2} y2={active.y + active.size} stroke="#10b981" strokeDasharray="4 4" />
                <line x1={active.x} y1={active.y + active.size / 2} x2={active.x + active.size} y2={active.y + active.size / 2} stroke="#10b981" strokeDasharray="4 4" />
              </g>
            )}

            {/* Target Indicator */}
            <circle cx={target.x} cy={target.y} r={4} fill="#f43f5e" className="pointer-events-none" />
            <circle cx={target.x} cy={target.y} r={12} fill="none" stroke="#f43f5e" strokeWidth={1} opacity={0.5} className="pointer-events-none group-active:animate-ping" />
          </svg>
        </div>

        {/* INFO PANEL */}
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-mono text-zinc-400 font-bold">Bisection Depth (n)</span>
              <span className="text-xs font-mono text-rose-400">n = {depth}</span>
            </div>
            <input
              type="range"
              min="0"
              max={maxDepth}
              value={depth}
              onChange={(e) => {
                setDepth(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-rose-500 bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Sequence State</h4>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Active Node:</span>
                <span className="text-emerald-400">Q_{depth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Side Length ($L_n$):</span>
                <span className="text-zinc-200">{(2 / Math.pow(2, depth)).toFixed(4)}R</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Winding No. $\Delta(Q_n)$:</span>
                <span className="text-amber-400">≥ 1 (Max {degree})</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-zinc-800/50">
                <span className="text-zinc-400">Discarded Regions:</span>
                <span className="text-zinc-200">{discarded.length} sub-squares</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
