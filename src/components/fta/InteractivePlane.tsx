"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';

export type BoundingBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ScreenToMath = (sx: number, sy: number) => { x: number; y: number };
export type MathToScreen = (x: number, y: number) => { sx: number; sy: number };

export type InteractivePlaneProps = Omit<React.SVGProps<SVGSVGElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerLeave' | 'onWheel' | 'children'> & {
  dataBounds: BoundingBox | null;
  padding?: number;
  children: (context: {
    screenToMath: ScreenToMath;
    mathToScreen: MathToScreen;
    viewBox: { x: number, y: number, w: number, h: number };
  }) => React.ReactNode;
};

export function InteractivePlane({
  dataBounds,
  padding = 1.2,
  children,
  className,
  ...svgProps
}: InteractivePlaneProps) {
  const [viewBox, setViewBox] = useState({ x: -10, y: -10, w: 20, h: 20 });
  const svgRef = useRef<SVGSVGElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartScreen, setDragStartScreen] = useState({ x: 0, y: 0 });
  const [viewBoxStart, setViewBoxStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Auto-fit logic
  useEffect(() => {
    if (!dataBounds) return;
    let { minX, maxX, minY, maxY } = dataBounds;
    
    // Fallback if points are all the same
    if (maxX - minX < 1e-5) { minX -= 1; maxX += 1; }
    if (maxY - minY < 1e-5) { minY -= 1; maxY += 1; }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = (maxX - minX) * padding;
    const h = (maxY - minY) * padding;
    
    // We want to fit it in whatever the SVG aspect ratio is, but we don't know the aspect ratio until render.
    // For simplicity, make it a square viewbox, or max size.
    const size = Math.max(w, h);
    
    setViewBox({
      x: cx - size / 2,
      // For mathematical y pointing up, if they just use viewBox as is, SVG y still points down.
      // Most of our code does `cy={-pt.im}`, meaning the drawn points are between -maxY and -minY.
      // So if dataBounds is minY..maxY, drawn points are -maxY..-minY.
      y: -(cy + size / 2),
      w: size,
      h: size
    });
  }, [dataBounds, padding]);

  const screenToMath = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    // In our SVG, y goes down, so real y is -svgPt.y
    return { x: svgPt.x, y: -svgPt.y };
  }, []);

  const mathToScreen = useCallback((x: number, y: number) => {
    if (!svgRef.current) return { sx: 0, sy: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = x;
    pt.y = -y;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { sx: 0, sy: 0 };
    const screenPt = pt.matrixTransform(ctm);
    return { sx: screenPt.x, sy: screenPt.y };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.defaultPrevented || e.isPropagationStopped()) return;
    setIsDragging(true);
    setDragStartScreen({ x: e.clientX, y: e.clientY });
    setViewBoxStart(viewBox);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    const dx = e.clientX - dragStartScreen.x;
    const dy = e.clientY - dragStartScreen.y;
    
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    
    const mathDx = dx / ctm.a;
    const mathDy = dy / ctm.d;
    
    setViewBox({
      ...viewBoxStart,
      x: viewBoxStart.x - mathDx,
      y: viewBoxStart.y - mathDy
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const cursorPt = pt.matrixTransform(ctm.inverse());
    
    const scaleFactor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    
    const newW = viewBox.w * scaleFactor;
    const newH = viewBox.h * scaleFactor;
    
    const relX = (cursorPt.x - viewBox.x) / viewBox.w;
    const relY = (cursorPt.y - viewBox.y) / viewBox.h;
    
    const newX = cursorPt.x - newW * relX;
    const newY = cursorPt.y - newH * relY;
    
    setViewBox({
      x: newX,
      y: newY,
      w: newW,
      h: newH
    });
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      className={`touch-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"} ${className || ""}`}
      {...svgProps}
    >
      {children({ screenToMath, mathToScreen, viewBox })}
    </svg>
  );
}
