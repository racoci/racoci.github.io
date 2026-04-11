"use client";

import React, { useMemo } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";
import { InteractivePlane } from "./InteractivePlane";

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

  const computeBounds = (pts: Complex[]) => {
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
    return { minX, maxX, minY, maxY };
  };

  const zBounds = useMemo(() => computeBounds(zPerimeter), [zPerimeter]);
  const pBounds = useMemo(() => computeBounds(pPerimeter), [pPerimeter]);

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
          bounds={zBounds}
          pts={zPerimeter}
          zPts={zPerimeter}
          getHue={getHue}
          padding={1.5}
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
          bounds={pBounds}
          pts={pPerimeter}
          zPts={zPerimeter}
          getHue={getHue}
          padding={1.2}
        />
        <span className="text-xs text-gray-500 mt-2">Drag to pan, scroll to zoom</span>
      </div>
    </div>
  );
}

function PlaneView({ width, height, bounds, pts, zPts, getHue, padding }: { 
  width: number, 
  height: number, 
  bounds: { minX: number, maxX: number, minY: number, maxY: number },
  pts: Complex[],
  zPts: Complex[],
  getHue: (z: Complex) => number,
  padding: number
}) {
  const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.re} ${-pt.im}`).join(' ') + ' Z';
  
  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-black shadow-sm touch-none">
      <InteractivePlane
        dataBounds={bounds}
        padding={padding}
        width={width}
        height={height}
      >
        {({ viewBox }) => (
          <>
            {/* Axes */}
            <line x1={viewBox.x} y1={0} x2={viewBox.x + viewBox.w} y2={0} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={viewBox.w/100} />
            <line x1={0} y1={viewBox.y} x2={0} y2={viewBox.y + viewBox.h} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={viewBox.w/100} />
            
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
          </>
        )}
      </InteractivePlane>
    </div>
  );
}
