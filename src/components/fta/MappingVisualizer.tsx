"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

export default function MappingVisualizer() {
  const coeffs = usePolynomial();
  const [speed, setSpeed] = useState<number>(80);

  const R = 1.2;
  const N = 12; // Grid resolution (NxN)
  
  // Create a 2D grid in Z-plane
  const zGrid = useMemo(() => {
    const grid: Complex[][] = [];
    for (let i = 0; i <= N; i++) {
      const row: Complex[] = [];
      const y = R - (i / N) * 2 * R;
      for (let j = 0; j <= N; j++) {
        const x = -R + (j / N) * 2 * R;
        row.push({ re: x, im: y });
      }
      grid.push(row);
    }
    return grid;
  }, [R, N]);

  // Evaluate the 2D grid in P(z)-plane
  const pGrid = useMemo(() => {
    return zGrid.map(row => row.map(z => evaluatePolynomial(coeffs, z)));
  }, [zGrid, coeffs]);

  const width = 280;
  const height = 280;

  // Auto-fit bounding box for P(z)
  const defaultPViewBox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pGrid.forEach(row => row.forEach(p => {
      if (p.re < minX) minX = p.re;
      if (p.re > maxX) maxX = p.re;
      if (p.im < minY) minY = p.im;
      if (p.im > maxY) maxY = p.im;
    }));
    if (minX > 0) minX = 0;
    if (maxX < 0) maxX = 0;
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;
    
    let w = Math.max(maxX - minX, maxY - minY);
    if (w === 0) w = 2; // fallback
    w *= 1.2; // padding
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    return {
      x: cx - w / 2,
      y: cy - w / 2,
      w: w,
      h: w
    };
  }, [pGrid]);

  const [pViewBox, setPViewBox] = useState(defaultPViewBox);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
    const viewBoxDx = (dx / width) * pViewBox.w;
    const viewBoxDy = (dy / height) * pViewBox.h;
    
    setPViewBox(prev => ({
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

  // Helper to get HSL hue based on angle of complex number
  const getHue = (z: Complex) => {
    let angle = Math.atan2(z.im, z.re);
    if (angle < 0) angle += 2 * Math.PI;
    return (angle / (2 * Math.PI)) * 360;
  };

  const renderGrid = (grid: Complex[][], isZPlane: boolean) => {
    const paths = [];
    // Horizontal lines
    for (let i = 0; i <= N; i++) {
      let d = "";
      for (let j = 0; j <= N; j++) {
        const pt = grid[i][j];
        const screenX = isZPlane ? width/2 + pt.re * (width/(2.5*R)) : pt.re;
        const screenY = isZPlane ? height/2 - pt.im * (height/(2.5*R)) : -pt.im;
        d += `${j === 0 ? 'M' : 'L'} ${screenX} ${screenY} `;
      }
      paths.push(<path key={`h-${i}`} d={d} fill="none" stroke="currentColor" strokeWidth={isZPlane ? 1 : pViewBox.w/200} className="text-gray-400 dark:text-gray-600 opacity-50" />);
    }
    // Vertical lines
    for (let j = 0; j <= N; j++) {
      let d = "";
      for (let i = 0; i <= N; i++) {
        const pt = grid[i][j];
        const screenX = isZPlane ? width/2 + pt.re * (width/(2.5*R)) : pt.re;
        const screenY = isZPlane ? height/2 - pt.im * (height/(2.5*R)) : -pt.im;
        d += `${i === 0 ? 'M' : 'L'} ${screenX} ${screenY} `;
      }
      paths.push(<path key={`v-${j}`} d={d} fill="none" stroke="currentColor" strokeWidth={isZPlane ? 1 : pViewBox.w/200} className="text-gray-400 dark:text-gray-600 opacity-50" />);
    }
    
    // Draw points with Hue gradient
    const points = [];
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const zPt = zGrid[i][j];
        const pt = grid[i][j];
        const screenX = isZPlane ? width/2 + pt.re * (width/(2.5*R)) : pt.re;
        const screenY = isZPlane ? height/2 - pt.im * (height/(2.5*R)) : -pt.im;
        const hue = getHue(zPt);
        points.push(
          <circle key={`pt-${i}-${j}`} cx={screenX} cy={screenY} r={isZPlane ? 3 : pViewBox.w/60} fill={`hsl(${hue}, 100%, 50%)`} />
        );
      }
    }
    return { paths, points };
  };

  const zRender = renderGrid(zGrid, true);
  const pRender = renderGrid(pGrid, false);

  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center my-8">
      {/* Z-plane */}
      <div className="flex flex-col items-center">
        <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">z-plane (Domain)</h4>
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-black shadow-sm">
          <svg width={width} height={height}>
            <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="2" />
            <line x1={width/2} y1={0} x2={width/2} y2={height} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="2" />
            {zRender.paths}
            {zRender.points}
          </svg>
        </div>
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
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-black shadow-sm cursor-grab active:cursor-grabbing touch-none">
          <svg 
            width={width} 
            height={height} 
            viewBox={`${pViewBox.x} ${-(pViewBox.y + pViewBox.h)} ${pViewBox.w} ${pViewBox.h}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            <line x1={pViewBox.x} y1={0} x2={pViewBox.x + pViewBox.w} y2={0} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={pViewBox.w/100} />
            <line x1={0} y1={-(pViewBox.y + pViewBox.h)} x2={0} y2={-pViewBox.y} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={pViewBox.w/100} />
            {pRender.paths}
            {pRender.points}
          </svg>
        </div>
        <span className="text-xs text-gray-500 mt-2">Drag to pan, scroll to zoom</span>
      </div>
    </div>
  );
}
