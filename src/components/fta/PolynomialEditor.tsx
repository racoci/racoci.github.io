'use client';
import React, { useState, useRef } from 'react';
import { usePolynomial, updateCoefficient, Complex } from './store';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1'];

function formatComplex(c: Complex, isFirst: boolean): string {
  const re = c.re;
  const im = c.im;
  if (re === 0 && im === 0) return isFirst ? '0' : '';
  
  let res = '';
  if (re !== 0) {
    res += re;
  }
  if (im !== 0) {
    if (im > 0 && re !== 0) res += ' + ';
    else if (im < 0 && re !== 0) res += ' - ';
    else if (im < 0) res += '-';
    
    const absIm = Math.abs(im);
    if (absIm !== 1) res += absIm;
    res += 'i';
  }
  return res;
}

function formatPolynomial(coeffs: Complex[]) {
  const terms: React.ReactNode[] = [];
  
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (c.re === 0 && c.im === 0) continue;
    
    let formatted = formatComplex(c, false);
    
    let needsParens = false;
    if (c.re !== 0 && c.im !== 0) {
      needsParens = true;
    }
    
    let sign = '';
    if (terms.length > 0) {
      if (formatted.startsWith('-')) {
        sign = ' - ';
        formatted = formatted.substring(1);
      } else {
        sign = ' + ';
      }
    }
    
    if (formatted === '1' && i > 0) formatted = '';
    else if (formatted === '-1' && i > 0 && terms.length === 0) {
      sign = '-';
      formatted = '';
    } else if (formatted === '-1' && i > 0 && terms.length > 0) {
      sign = ' - ';
      formatted = '';
    }
    
    let term = (
      <React.Fragment key={i}>
        {sign}
        {needsParens ? `(${formatted})` : formatted}
        {i > 0 && 'z'}
        {i > 1 && <sup>{i}</sup>}
      </React.Fragment>
    );
    
    terms.push(term);
  }
  
  if (terms.length === 0) {
    return <span>0</span>;
  }
  
  return <span>{terms}</span>;
}

export default function PolynomialEditor() {
  const coeffs = usePolynomial();
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const width = 400;
  const height = 400;
  const scale = 100;
  const cx = width / 2;
  const cy = height / 2;
  
  const toScreen = (c: Complex) => ({
    x: cx + c.re * scale,
    y: cy - c.im * scale,
  });
  
  const fromScreen = (x: number, y: number): Complex => {
    let re = (x - cx) / scale;
    let im = (cy - y) / scale;
    
    // Snap to 0.25
    re = Math.round(re * 4) / 4;
    im = Math.round(im * 4) / 4;
    
    return { re, im };
  };
  
  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingIdx(idx);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdx === null || !svgRef.current) return;
    
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    const newValue = fromScreen(cursorPt.x, cursorPt.y);
    updateCoefficient(draggingIdx, newValue);
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingIdx(null);
  };
  
  return (
    <div className="flex flex-col items-center gap-4 my-8 p-4 border rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-semibold">Polynomial Editor</h3>
      <div className="relative border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black shadow-sm overflow-hidden touch-none select-none">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Grid lines */}
          <line x1={0} y1={cy} x2={width} y2={cy} stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="2" />
          <line x1={cx} y1={0} x2={cx} y2={height} stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="2" />
          
          {[-2, -1, 1, 2].map((tick) => (
            <React.Fragment key={tick}>
              <line x1={cx + tick * scale} y1={cy - 4} x2={cx + tick * scale} y2={cy + 4} stroke="currentColor" className="text-gray-400" />
              <line x1={cx - 4} y1={cy - tick * scale} x2={cx + 4} y2={cy - tick * scale} stroke="currentColor" className="text-gray-400" />
            </React.Fragment>
          ))}

          {coeffs.map((c, i) => {
            const pos = toScreen(c);
            const isDragging = draggingIdx === i;
            return (
              <g key={i}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isDragging ? 12 : 8}
                  fill={COLORS[i % COLORS.length]}
                  className="cursor-pointer transition-all duration-75"
                  onPointerDown={(e) => handlePointerDown(e, i)}
                />
                {isDragging && (
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-xs font-mono pointer-events-none drop-shadow-md bg-white dark:bg-black px-1"
                  >
                    c{i}: {c.re}{c.im >= 0 ? '+' : ''}{c.im}i
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="text-xl font-serif mt-2 italic flex flex-wrap gap-2 items-center justify-center p-3 bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 w-full overflow-x-auto">
        <span>P(z) = </span>
        {formatPolynomial(coeffs)}
      </div>
    </div>
  );
}
