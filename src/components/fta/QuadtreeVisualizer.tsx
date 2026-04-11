"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";
import { InteractivePlane } from "./InteractivePlane";

type Box = { x: number; y: number; size: number; depth: number };

export default function QuadtreeVisualizer() {
  const coeffs = usePolynomial();
  
  const rootSize = 280;
  const R = 2.0;

  // target is now in math coordinates [-R, R]
  const [target, setTarget] = useState<Complex>({ re: 0, im: 0 });
  const [depth, setDepth] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);

  const maxDepth = 6;

  // Compute bounding boxes
  const zBounds = { minX: -R, maxX: R, minY: -R, maxY: R };
  
  const [pBounds, setPBounds] = useState({ minX: -2, maxX: 2, minY: -2, maxY: 2 });

  // Initial P-plane bounding box based on coeffs
  useEffect(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    // sample perimeter of the [-R, R] square
    for (let i = 0; i <= 20; i++) {
      const perimeters = [
        { re: -R + (i/20) * 2 * R, im: -R },
        { re: R, im: -R + (i/20) * 2 * R },
        { re: R - (i/20) * 2 * R, im: R },
        { re: -R, im: R - (i/20) * 2 * R }
      ];
      for (const z of perimeters) {
        const p = evaluatePolynomial(coeffs, z);
        if (p.re < minX) minX = p.re;
        if (p.re > maxX) maxX = p.re;
        if (p.im < minY) minY = p.im;
        if (p.im > maxY) maxY = p.im;
      }
    }
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;
    if (minX === Infinity) {
      minX = -2; maxX = 2; minY = -2; maxY = 2;
    }
    setPBounds({ minX, maxX, minY, maxY });
  }, [coeffs]);

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
    let currentActive: Box = { x: -R, y: -R, size: 2 * R, depth: 0 };

    for (let n = 1; n <= depth; n++) {
      const half = currentActive.size / 2;
      const boxes: Box[] = [
        { x: currentActive.x, y: currentActive.y, size: half, depth: n }, // bottom-left
        { x: currentActive.x + half, y: currentActive.y, size: half, depth: n }, // bottom-right
        { x: currentActive.x, y: currentActive.y + half, size: half, depth: n }, // top-left
        { x: currentActive.x + half, y: currentActive.y + half, size: half, depth: n }, // top-right
      ];

      let newActive: Box | null = null;
      for (const b of boxes) {
        if (
          target.re >= b.x &&
          target.re <= b.x + b.size &&
          target.im >= b.y &&
          target.im <= b.y + b.size
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

  const getMappedPath = (b: Box) => {
    const steps = 4;
    let d = "";
    
    // Bottom edge (y = b.y)
    for (let i = 0; i <= steps; i++) {
      const z = { re: b.x + (i / steps) * b.size, im: b.y };
      const p = evaluatePolynomial(coeffs, z);
      d += `${i === 0 ? 'M' : 'L'} ${p.re} ${-p.im} `;
    }
    // Right edge (x = b.x + b.size)
    for (let i = 1; i <= steps; i++) {
      const z = { re: b.x + b.size, im: b.y + (i / steps) * b.size };
      const p = evaluatePolynomial(coeffs, z);
      d += `L ${p.re} ${-p.im} `;
    }
    // Top edge (y = b.y + b.size, moving left)
    for (let i = 1; i <= steps; i++) {
      const z = { re: b.x + b.size - (i / steps) * b.size, im: b.y + b.size };
      const p = evaluatePolynomial(coeffs, z);
      d += `L ${p.re} ${-p.im} `;
    }
    // Left edge (x = b.x, moving down)
    for (let i = 1; i <= steps; i++) {
      const z = { re: b.x, im: b.y + b.size - (i / steps) * b.size };
      const p = evaluatePolynomial(coeffs, z);
      d += `L ${p.re} ${-p.im} `;
    }
    d += "Z";
    return d;
  };

  const handleTargetPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDraggingTarget(true);
    setIsPlaying(true);
    setDepth(0);
  };

  const handleTargetPointerUp = (e: React.PointerEvent) => {
    setIsDraggingTarget(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col items-center gap-6 my-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl w-full max-w-4xl mx-auto">
      <div className="text-center w-full">
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
          Dual Quadtree Visualizer
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl mx-auto">
          Drag the red target point in the domain (z-plane) to see how the quadtree isolates it. Drag empty space to pan, scroll to zoom.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 justify-center items-center w-full">
        
        {/* Z-plane Quadtree */}
        <div className="flex flex-col items-center">
          <h4 className="font-semibold mb-3 text-sm text-zinc-700 dark:text-zinc-300">z-plane (Domain Quadtree)</h4>
          <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm touch-none">
            <InteractivePlane
              dataBounds={zBounds}
              padding={1.2}
              width={rootSize}
              height={rootSize}
            >
              {({ screenToMath, viewBox }) => (
                <g 
                  onPointerMove={(e) => {
                    if (isDraggingTarget) {
                      const pt = screenToMath(e.clientX, e.clientY);
                      let re = Math.max(-R, Math.min(R, pt.x));
                      let im = Math.max(-R, Math.min(R, pt.y));
                      setTarget({ re, im });
                      setDepth(0);
                    }
                  }}
                  onPointerUp={handleTargetPointerUp}
                  onPointerLeave={handleTargetPointerUp}
                >
                  <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="transparent" />
                  
                  {discarded.map((b, i) => (
                    <rect
                      key={`z-discard-${i}`}
                      x={b.x}
                      y={-b.y - b.size}
                      width={b.size}
                      height={b.size}
                      fill={`hsla(340, 70%, ${20 + b.depth * 10}%, 0.4)`}
                      stroke={`hsla(340, 70%, ${30 + b.depth * 10}%, 0.8)`}
                      strokeWidth={viewBox.w/300}
                    />
                  ))}
                  
                  <rect
                    x={active.x}
                    y={-active.y - active.size}
                    width={active.size}
                    height={active.size}
                    fill={`hsla(160, 70%, ${20 + active.depth * 10}%, 0.5)`}
                    stroke={`hsla(160, 70%, ${30 + active.depth * 10}%, 0.9)`}
                    strokeWidth={viewBox.w/150}
                  />

                  <circle 
                    cx={target.re} 
                    cy={-target.im} 
                    r={viewBox.w/50} 
                    fill="#f43f5e" 
                    stroke="#fff" 
                    strokeWidth={viewBox.w/300}
                    className="cursor-crosshair hover:opacity-80"
                    onPointerDown={handleTargetPointerDown} 
                  />
                </g>
              )}
            </InteractivePlane>
          </div>
        </div>

        {/* P(z)-plane Quadtree */}
        <div className="flex flex-col items-center">
          <h4 className="font-semibold mb-3 text-sm text-zinc-700 dark:text-zinc-300">P(z)-plane (Mapped Quadtree)</h4>
          <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm touch-none">
            <InteractivePlane
              dataBounds={pBounds}
              padding={1.2}
              width={rootSize}
              height={rootSize}
            >
              {({ viewBox }) => (
                <>
                  {/* Axes */}
                  <line x1={viewBox.x} y1={0} x2={viewBox.x + viewBox.w} y2={0} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={viewBox.w/150} />
                  <line x1={0} y1={viewBox.y} x2={0} y2={viewBox.y + viewBox.h} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={viewBox.w/150} />

                  {discarded.map((b, i) => {
                    const lightness = 20 + b.depth * 10; 
                    return <path key={`p-d-${i}`} d={getMappedPath(b)} fill={`hsla(340, 70%, ${lightness}%, 0.4)`} stroke={`hsla(340, 70%, ${lightness + 10}%, 0.6)`} strokeWidth={viewBox.w/200} strokeLinejoin="round" />;
                  })}
                  
                  {(() => {
                    const lightness = 20 + active.depth * 10; 
                    return <path d={getMappedPath(active)} fill={`hsla(160, 70%, ${lightness}%, 0.6)`} stroke={`hsla(160, 70%, ${lightness + 10}%, 0.9)`} strokeWidth={viewBox.w/200} strokeLinejoin="round" />;
                  })()}
                  
                  {/* Mapped target */}
                  {(() => {
                    const p = evaluatePolynomial(coeffs, target);
                    return (
                      <circle 
                        cx={p.re} 
                        cy={-p.im} 
                        r={viewBox.w/50} 
                        fill="#f43f5e" 
                        stroke="#fff" 
                        strokeWidth={viewBox.w/300}
                      />
                    );
                  })()}
                </>
              )}
            </InteractivePlane>
          </div>
        </div>

      </div>
    </div>
  );
}
