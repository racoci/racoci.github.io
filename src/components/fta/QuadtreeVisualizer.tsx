"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

type Box = { x: number; y: number; size: number; depth: number };

export default function QuadtreeVisualizer() {
  const coeffs = usePolynomial();
  
  const [target, setTarget] = useState<{ x: number; y: number }>({ x: 140, y: 140 });
  const [depth, setDepth] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const maxDepth = 6;
  const rootSize = 280;
  
  const R = 2.0;

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
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const { discarded, active } = useMemo(() => {
    const discardedBoxes: Box[] = [];
    let currentActive: Box = { x: 0, y: 0, size: rootSize, depth: 0 };

    for (let n = 1; n <= depth; n++) {
      const half = currentActive.size / 2;
      const boxes: Box[] = [
        { x: currentActive.x, y: currentActive.y, size: half, depth: n },
        { x: currentActive.x + half, y: currentActive.y, size: half, depth: n },
        { x: currentActive.x, y: currentActive.y + half, size: half, depth: n },
        { x: currentActive.x + half, y: currentActive.y + half, size: half, depth: n },
      ];

      let newActive: Box | null = null;
      for (const b of boxes) {
        if (
          target.x >= b.x &&
          target.x <= b.x + b.size &&
          target.y >= b.y &&
          target.y <= b.y + b.size
        ) {
          if (!newActive) newActive = b;
          else discardedBoxes.push(b);
        } else {
          discardedBoxes.push(b);
        }
      }

      if (!newActive) newActive = boxes[0];
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
    if (e.buttons !== 1) return; 
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.max(0, Math.min(rootSize, x));
    y = Math.max(0, Math.min(rootSize, y));
    setTarget({ x, y });
    setDepth(0);
  };

  const screenToComplex = (x: number, y: number): Complex => ({
    re: -R + (x / rootSize) * 2 * R,
    im: R - (y / rootSize) * 2 * R
  });

  const getMappedPath = (b: Box) => {
    const steps = 4;
    let d = "";
    
    // Top edge
    for (let i = 0; i <= steps; i++) {
      const z = screenToComplex(b.x + (i / steps) * b.size, b.y);
      const p = evaluatePolynomial(coeffs, z);
      d += `${i === 0 ? 'M' : 'L'} ${p.re} ${-p.im} `;
    }
    // Right edge
    for (let i = 1; i <= steps; i++) {
      const z = screenToComplex(b.x + b.size, b.y + (i / steps) * b.size);
      const p = evaluatePolynomial(coeffs, z);
      d += `L ${p.re} ${-p.im} `;
    }
    // Bottom edge
    for (let i = 1; i <= steps; i++) {
      const z = screenToComplex(b.x + b.size - (i / steps) * b.size, b.y + b.size);
      const p = evaluatePolynomial(coeffs, z);
      d += `L ${p.re} ${-p.im} `;
    }
    // Left edge
    for (let i = 1; i <= steps; i++) {
      const z = screenToComplex(b.x, b.y + b.size - (i / steps) * b.size);
      const p = evaluatePolynomial(coeffs, z);
      d += `L ${p.re} ${-p.im} `;
    }
    d += "Z";
    return d;
  };

  const renderMappedBox = (b: Box, isDiscarded: boolean) => {
    const lightness = 20 + b.depth * 10; 
    const fillStr = isDiscarded 
      ? `hsla(340, 70%, ${lightness}%, 0.4)` // Rose
      : `hsla(160, 70%, ${lightness}%, 0.6)`; // Emerald
      
    const strokeStr = isDiscarded 
      ? `hsla(340, 70%, ${lightness + 10}%, 0.6)` 
      : `hsla(160, 70%, ${lightness + 10}%, 0.9)`;
    
    return <path key={`p-${b.x}-${b.y}-${b.size}`} d={getMappedPath(b)} fill={fillStr} stroke={strokeStr} strokeWidth="0.1" strokeLinejoin="round" />;
  };

  const pViewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Sample perimeter of domain
    for (let i = 0; i <= 20; i++) {
      const perimeters = [
        { x: i/20 * rootSize, y: 0 },
        { x: rootSize, y: i/20 * rootSize },
        { x: rootSize - i/20 * rootSize, y: rootSize },
        { x: 0, y: rootSize - i/20 * rootSize }
      ];
      
      for (const pt of perimeters) {
        const z = screenToComplex(pt.x, pt.y);
        const p = evaluatePolynomial(coeffs, z);
        if (p.re < minX) minX = p.re;
        if (p.re > maxX) maxX = p.re;
        if (-p.im < minY) minY = -p.im; // Note: SVG y is inverted
        if (-p.im > maxY) maxY = -p.im;
      }
    }
    
    // Make sure we include origin
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;
    
    let w = Math.max(maxX - minX, maxY - minY);
    if (w === 0) w = 2; 
    w *= 1.2; 
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    return {
      x: cx - w / 2,
      y: cy - w / 2,
      w: w,
      h: w
    };
  }, [coeffs]);

  return (
    <div className="flex flex-col items-center gap-6 my-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl w-full max-w-4xl mx-auto">
      <div className="text-center w-full">
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
          Dual Quadtree Visualizer
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl mx-auto">
          Click and drag in the domain (z-plane) to see how the quadtree progressively isolates the target, and observe the corresponding deformation mapped to the P(z)-plane. Lighter colors indicate deeper zoom levels.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 justify-center items-center w-full">
        
        {/* Z-plane Quadtree */}
        <div className="flex flex-col items-center">
          <h4 className="font-semibold mb-3 text-sm text-zinc-700 dark:text-zinc-300">z-plane (Domain Quadtree)</h4>
          <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm touch-none">
            <svg 
              width={rootSize} 
              height={rootSize} 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              className="cursor-crosshair block"
            >
              <rect x={0} y={0} width={rootSize} height={rootSize} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="2" />
              
              {discarded.map((b, i) => (
                <rect
                  key={`z-discard-${i}`}
                  x={b.x}
                  y={b.y}
                  width={b.size}
                  height={b.size}
                  fill={`hsla(340, 70%, ${20 + b.depth * 10}%, 0.4)`}
                  stroke={`hsla(340, 70%, ${30 + b.depth * 10}%, 0.8)`}
                  strokeWidth="1"
                />
              ))}
              
              <rect
                x={active.x}
                y={active.y}
                width={active.size}
                height={active.size}
                fill={`hsla(160, 70%, ${20 + active.depth * 10}%, 0.5)`}
                stroke={`hsla(160, 70%, ${30 + active.depth * 10}%, 0.9)`}
                strokeWidth="2"
              />

              <circle cx={target.x} cy={target.y} r={4} fill="#f43f5e" stroke="#fff" strokeWidth={1} />
            </svg>
          </div>
        </div>

        {/* P(z)-plane Quadtree */}
        <div className="flex flex-col items-center">
          <h4 className="font-semibold mb-3 text-sm text-zinc-700 dark:text-zinc-300">P(z)-plane (Mapped Quadtree)</h4>
          <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm">
            <svg 
              width={rootSize} 
              height={rootSize} 
              viewBox={`${pViewBox.x} ${pViewBox.y} ${pViewBox.w} ${pViewBox.h}`}
              className="block"
            >
              {/* Axes */}
              <line x1={pViewBox.x} y1={0} x2={pViewBox.x + pViewBox.w} y2={0} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={pViewBox.w/150} />
              <line x1={0} y1={pViewBox.y} x2={0} y2={pViewBox.y + pViewBox.h} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={pViewBox.w/150} />

              {discarded.map((b) => renderMappedBox(b, true))}
              {renderMappedBox(active, false)}
              
              {/* Mapped target */}
              {(() => {
                const z = screenToComplex(target.x, target.y);
                const p = evaluatePolynomial(coeffs, z);
                return <circle cx={p.re} cy={-p.im} r={pViewBox.w/50} fill="#f43f5e" stroke="#fff" strokeWidth={pViewBox.w/200} />;
              })()}
            </svg>
          </div>
        </div>

      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            setDepth(0);
            setIsPlaying(true);
          }}
          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          {isPlaying ? "Restart Animation" : "Replay Sequence"}
        </button>
      </div>
    </div>
  );
}
