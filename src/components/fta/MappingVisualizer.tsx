"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

export default function MappingVisualizer() {
  const coeffs = usePolynomial();

  const R = 1.2;
  const N = 30; // Points per edge
  
  // Create 1D array of points in Z-plane representing the perimeter
  const zPerimeter = useMemo(() => {
    const pts: Complex[] = [];
    
    // Top edge: (-R, R) to (R, R)
    for (let i = 0; i < N; i++) pts.push({ re: -R + (i/N)*2*R, im: R });
    // Right edge: (R, R) to (R, -R)
    for (let i = 0; i < N; i++) pts.push({ re: R, im: R - (i/N)*2*R });
    // Bottom edge: (R, -R) to (-R, -R)
    for (let i = 0; i < N; i++) pts.push({ re: R - (i/N)*2*R, im: -R });
    // Left edge: (-R, -R) to (-R, R)
    for (let i = 0; i < N; i++) pts.push({ re: -R, im: -R + (i/N)*2*R });
    
    return pts;
  }, [R, N]);

  // Evaluate the perimeter in P(z)-plane
  const pPerimeter = useMemo(() => {
    return zPerimeter.map(z => evaluatePolynomial(coeffs, z));
  }, [zPerimeter, coeffs]);

  const width = 280;
  const height = 280;

  // Auto-fit bounding box for Z and P(z)
  const computeBoundingBox = (pts: Complex[], padding = 1.2) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(p => {
      if (p.re < minX) minX = p.re;
      if (p.re > maxX) maxX = p.re;
      if (p.im < minY) minY = p.im;
      if (p.im > maxY) maxY = p.im;
    });
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;
    
    let w = Math.max(maxX - minX, maxY - minY);
    if (w === 0) w = 2; // fallback
    w *= padding; // padding
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    return {
      x: cx - w / 2,
      y: cy - w / 2,
      w: w,
      h: w
    };
  };

  const defaultZViewBox = useMemo(() => computeBoundingBox(zPerimeter, 1.5), [zPerimeter]);
  const defaultPViewBox = useMemo(() => computeBoundingBox(pPerimeter, 1.2), [pPerimeter]);

  // Helper to get HSL hue based on angle of complex number in Z-plane
  const getHue = (z: Complex) => {
    let angle = Math.atan2(z.im, z.re);
    if (angle < 0) angle += 2 * Math.PI;
    return (angle / (2 * Math.PI)) * 360;
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center my-8">
      {/* Z-plane */}
      <div className="flex flex-col items-center">
        <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">z-plane (Domain)</h4>
        <PlaneView 
          width={width} 
          height={height} 
          defaultViewBox={defaultZViewBox}
          pts={zPerimeter}
          zPts={zPerimeter}
          getHue={getHue}
        />
        <span className="text-xs text-gray-500 mt-2">Drag to pan, scroll to zoom</span>
      </div>
      
      {/* Arrow */}
      <div className="hidden md:flex text-gray-400">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>

      {/* P(z)-plane */}
      <div className="flex flex-col items-center">
        <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">P(z)-plane (Image)</h4>
        <PlaneView 
          width={width} 
          height={height} 
          defaultViewBox={defaultPViewBox}
          pts={pPerimeter}
          zPts={zPerimeter}
          getHue={getHue}
        />
        <span className="text-xs text-gray-500 mt-2">Drag to pan, scroll to zoom</span>
      </div>
    </div>
  );
}

function PlaneView({ width, height, defaultViewBox, pts, zPts, getHue }: { 
  width: number, 
  height: number, 
  defaultViewBox: { x: number, y: number, w: number, h: number },
  pts: Complex[],
  zPts: Complex[],
  getHue: (z: Complex) => number 
}) {
  const [viewBox, setViewBox] = useState(defaultViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setViewBox(defaultViewBox);
  }, [defaultViewBox]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    const viewBoxDx = (dx / width) * viewBox.w;
    const viewBoxDy = (dy / height) * viewBox.h;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - viewBoxDx,
      y: prev.y + viewBoxDy
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    setViewBox(prev => {
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

  const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.re} ${-pt.im}`).join(' ') + ' Z';
  
  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-black shadow-sm cursor-grab active:cursor-grabbing touch-none">
      <svg 
        width={width} 
        height={height} 
        viewBox={`${viewBox.x} ${-(viewBox.y + viewBox.h)} ${viewBox.w} ${viewBox.h}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Axes */}
        <line x1={viewBox.x} y1={0} x2={viewBox.x + viewBox.w} y2={0} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={viewBox.w/100} />
        <line x1={0} y1={-(viewBox.y + viewBox.h)} x2={0} y2={-viewBox.y} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={viewBox.w/100} />
        
        {/* Perimeter Path */}
        <path d={d} fill="none" stroke="currentColor" strokeWidth={viewBox.w/200} className="text-gray-400 dark:text-gray-600 opacity-50" />
        
        {/* Points */}
        {pts.map((pt, i) => {
          const hue = getHue(zPts[i]);
          return (
            <circle 
              key={`pt-${i}`} 
              cx={pt.re} 
              cy={-pt.im} 
              r={viewBox.w/60} 
              fill={`hsl(${hue}, 100%, 50%)`} 
            />
          );
        })}
      </svg>
    </div>
  );
}
