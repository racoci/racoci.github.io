"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

type Box = { x: number; y: number; size: number; depth: number };

export default function QuadtreeVisualizer() {
  const coeffs = usePolynomial();
  
  const rootSize = 280;
  const R = 2.0;

  const [target, setTarget] = useState<{ x: number; y: number }>({ x: 140, y: 140 });
  const [depth, setDepth] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Camera state for Z-plane
  const [zViewBox, setZViewBox] = useState({ x: 0, y: 0, w: rootSize, h: rootSize });
  const [zPanStart, setZPanStart] = useState({ x: 0, y: 0 });
  const [isZPanning, setIsZPanning] = useState(false);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);

  // Camera state for P-plane
  const [pViewBox, setPViewBox] = useState({ x: -2, y: -2, w: 4, h: 4 });
  const [pPanStart, setPPanStart] = useState({ x: 0, y: 0 });
  const [isPPanning, setIsPPanning] = useState(false);

  const maxDepth = 6;

  // Initial P-plane bounding box based on coeffs
  useEffect(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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
        if (-p.im < minY) minY = -p.im; // SVG y inverted
        if (-p.im > maxY) maxY = -p.im;
      }
    }
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;
    let w = Math.max(maxX - minX, maxY - minY);
    if (w === 0) w = 2; 
    w *= 1.2; 
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setPViewBox({ x: cx - w / 2, y: cy - w / 2, w, h: w });
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
      ? `hsla(340, 70%, ${lightness}%, 0.4)`
      : `hsla(160, 70%, ${lightness}%, 0.6)`;
      
    const strokeStr = isDiscarded 
      ? `hsla(340, 70%, ${lightness + 10}%, 0.6)` 
      : `hsla(160, 70%, ${lightness + 10}%, 0.9)`;
    
    return <path key={`p-${b.x}-${b.y}-${b.size}`} d={getMappedPath(b)} fill={fillStr} stroke={strokeStr} strokeWidth={pViewBox.w/200} strokeLinejoin="round" />;
  };

  // --- Z-Plane Handlers ---
  const handleZPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setZPanStart({ x: e.clientX, y: e.clientY });
    setIsZPanning(true);
  };
  const handleZPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingTarget) {
      const svg = e.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      let x = Math.max(0, Math.min(rootSize, cursorPt.x));
      let y = Math.max(0, Math.min(rootSize, cursorPt.y));
      setTarget({ x, y });
      setDepth(0);
    } else if (isZPanning) {
      const dx = e.clientX - zPanStart.x;
      const dy = e.clientY - zPanStart.y;
      const viewBoxDx = (dx / rootSize) * zViewBox.w;
      const viewBoxDy = (dy / rootSize) * zViewBox.h;
      setZViewBox(prev => ({
        ...prev,
        x: prev.x - viewBoxDx,
        y: prev.y - viewBoxDy
      }));
      setZPanStart({ x: e.clientX, y: e.clientY });
    }
  };
  const handleZPointerUp = () => {
    setIsZPanning(false);
    setIsDraggingTarget(false);
  };
  const handleZWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    setZViewBox(prev => {
      const newW = prev.w * zoomFactor;
      const newH = prev.h * zoomFactor;
      return {
        ...prev,
        x: prev.x + (prev.w - newW) / 2,
        y: prev.y + (prev.h - newH) / 2,
        w: newW,
        h: newH
      };
    });
  };

  const handleTargetPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDraggingTarget(true);
    setIsPlaying(true);
    setDepth(0);
  };

  // --- P-Plane Handlers ---
  const handlePPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setPPanStart({ x: e.clientX, y: e.clientY });
    setIsPPanning(true);
  };
  const handlePPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPPanning) return;
    const dx = e.clientX - pPanStart.x;
    const dy = e.clientY - pPanStart.y;
    const viewBoxDx = (dx / rootSize) * pViewBox.w;
    const viewBoxDy = (dy / rootSize) * pViewBox.h;
    
    setPViewBox(prev => ({
      ...prev,
      x: prev.x - viewBoxDx,
      y: prev.y - viewBoxDy
    }));
    setPPanStart({ x: e.clientX, y: e.clientY });
  };
  const handlePPointerUp = () => setIsPPanning(false);
  const handlePWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    setPViewBox(prev => {
      const newW = prev.w * zoomFactor;
      const newH = prev.h * zoomFactor;
      return {
        ...prev,
        x: prev.x + (prev.w - newW) / 2,
        y: prev.y + (prev.h - newH) / 2,
        w: newW,
        h: newH
      };
    });
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
            <svg 
              width={rootSize} 
              height={rootSize} 
              viewBox={`${zViewBox.x} ${zViewBox.y} ${zViewBox.w} ${zViewBox.h}`}
              onPointerDown={handleZPointerDown}
              onPointerMove={handleZPointerMove}
              onPointerUp={handleZPointerUp}
              onPointerLeave={handleZPointerUp}
              onWheel={handleZWheel}
              className="cursor-grab active:cursor-grabbing block"
            >
              <rect x={0} y={0} width={rootSize} height={rootSize} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={zViewBox.w/150} />
              
              {discarded.map((b, i) => (
                <rect
                  key={`z-discard-${i}`}
                  x={b.x}
                  y={b.y}
                  width={b.size}
                  height={b.size}
                  fill={`hsla(340, 70%, ${20 + b.depth * 10}%, 0.4)`}
                  stroke={`hsla(340, 70%, ${30 + b.depth * 10}%, 0.8)`}
                  strokeWidth={zViewBox.w/300}
                />
              ))}
              
              <rect
                x={active.x}
                y={active.y}
                width={active.size}
                height={active.size}
                fill={`hsla(160, 70%, ${20 + active.depth * 10}%, 0.5)`}
                stroke={`hsla(160, 70%, ${30 + active.depth * 10}%, 0.9)`}
                strokeWidth={zViewBox.w/150}
              />

              <circle 
                cx={target.x} 
                cy={target.y} 
                r={zViewBox.w/70} 
                fill="#f43f5e" 
                stroke="#fff" 
                strokeWidth={zViewBox.w/300}
                className="cursor-crosshair hover:opacity-80"
                onPointerDown={handleTargetPointerDown} 
              />
            </svg>
          </div>
        </div>

        {/* P(z)-plane Quadtree */}
        <div className="flex flex-col items-center">
          <h4 className="font-semibold mb-3 text-sm text-zinc-700 dark:text-zinc-300">P(z)-plane (Mapped Quadtree)</h4>
          <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-black shadow-sm touch-none">
            <svg 
              width={rootSize} 
              height={rootSize} 
              viewBox={`${pViewBox.x} ${pViewBox.y} ${pViewBox.w} ${pViewBox.h}`}
              onPointerDown={handlePPointerDown}
              onPointerMove={handlePPointerMove}
              onPointerUp={handlePPointerUp}
              onPointerLeave={handlePPointerUp}
              onWheel={handlePWheel}
              className="cursor-grab active:cursor-grabbing block"
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
                return <circle cx={p.re} cy={-p.im} r={pViewBox.w/70} fill="#f43f5e" stroke="#fff" strokeWidth={pViewBox.w/300} />;
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
