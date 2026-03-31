'use client';
import React, { useState, useRef } from 'react';
import { useStore, updateCoefficient, updateRoot, setIsRootsMode, setFractionDepth, Complex, formatComplexFraction, parseComplex } from './store';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#a855f7', '#ec4899'];

const ComplexInput = ({ value, onChange, color, depth, prefix = '', suffix = '' }: { value: Complex, onChange: (c: Complex) => void, color: string, depth: number, prefix?: string, suffix?: string }) => {
  const [editing, setEditing] = useState(false);
  const [str, setStr] = useState('');

  const displayStr = formatComplexFraction(value, depth);
  const needsParens = value.re !== 0 && value.im !== 0;

  if (editing) {
    return (
      <input 
        autoFocus 
        className="bg-gray-100 dark:bg-gray-800 border-b border-gray-400 outline-none text-center rounded px-1"
        style={{ color, width: Math.max(str.length * 12, 40) + 'px', minWidth: '40px' }}
        value={str}
        onChange={e => setStr(e.target.value)}
        onBlur={() => { setEditing(false); onChange(parseComplex(str)); }}
        onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onChange(parseComplex(str)); } }}
      />
    );
  }
  
  return (
    <span 
      onClick={() => { setEditing(true); setStr(displayStr); }} 
      style={{ color, cursor: 'text', borderBottom: '1px dashed currentColor', padding: '0 2px' }}
    >
      {prefix}{needsParens && !prefix ? `(${displayStr})` : displayStr}{suffix}
    </span>
  );
};

export default function PolynomialEditor() {
  const store = useStore();
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
    // Snap to 0.25 (optional, can be disabled or made finer)
    re = Math.round(re * 8) / 8;
    im = Math.round(im * 8) / 8;
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
    if (store.isRootsMode) {
      updateRoot(draggingIdx, newValue);
    } else {
      updateCoefficient(draggingIdx, newValue);
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingIdx(null);
  };

  const pts = store.isRootsMode ? store.roots : store.coefficients;

  return (
    <div className="flex flex-col items-center gap-6 my-8 p-6 border rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm w-full max-w-2xl mx-auto">
      <div className="flex flex-row justify-between w-full">
        <h3 className="text-xl font-bold">Polynomial Editor</h3>
        
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium">Mode:</span>
            <select 
              value={store.isRootsMode ? 'roots' : 'coeffs'} 
              onChange={e => setIsRootsMode(e.target.value === 'roots')}
              className="p-1 rounded border dark:bg-gray-800"
            >
              <option value="coeffs">Coefficients</option>
              <option value="roots">Roots</option>
            </select>
          </label>
        </div>
      </div>

      <label className="flex items-center justify-between w-full max-w-xs gap-4">
        <span className="text-sm font-medium whitespace-nowrap">Fraction Complexity (0-5): {store.fractionDepth}</span>
        <input 
          type="range" min="0" max="5" 
          value={store.fractionDepth} 
          onChange={e => setFractionDepth(parseInt(e.target.value))}
          className="flex-1"
        />
      </label>

      {/* WYSIWYG Editor */}
      <div className="text-lg font-mono tracking-wider overflow-x-auto w-full text-center py-4 bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800">
        <span className="font-bold">P(z) = </span>
        {store.isRootsMode ? (
          <div className="inline-flex flex-wrap justify-center items-center gap-1">
            {store.roots.length === 0 ? <span>0</span> : null}
            {store.roots.map((r, i) => (
              <span key={i} className="whitespace-nowrap">
                (z - <ComplexInput value={r} onChange={v => updateRoot(i, v)} color={COLORS[i % COLORS.length]} depth={store.fractionDepth} />)
              </span>
            ))}
          </div>
        ) : (
          <div className="inline-flex flex-wrap justify-center items-center gap-2">
            {store.coefficients.map((c, i) => {
              if (c.re === 0 && c.im === 0 && i !== store.coefficients.length - 1 && !store.isRootsMode) return null;
              return (
                <span key={i} className="whitespace-nowrap">
                  {i < store.coefficients.length - 1 ? ' + ' : ''}
                  <ComplexInput value={c} onChange={v => updateCoefficient(i, v)} color={COLORS[i % COLORS.length]} depth={store.fractionDepth} />
                  {i > 0 && <span>z{i > 1 && <sup>{i}</sup>}</span>}
                </span>
              );
            }).reverse()}
          </div>
        )}
      </div>

      <div className="relative border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black shadow-inner overflow-hidden touch-none select-none">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="cursor-crosshair"
        >
          {/* Grid lines */}
          <line x1={0} y1={cy} x2={width} y2={cy} stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1" />
          <line x1={cx} y1={0} x2={cx} y2={height} stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1" />
          
          <circle cx={cx} cy={cy} r={scale} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="4 4" />
          <circle cx={cx} cy={cy} r={scale*2} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="4 4" />

          {/* Points */}
          {pts.map((pt, i) => {
            const { x, y } = toScreen(pt);
            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <circle
                  r={8}
                  fill={COLORS[i % COLORS.length]}
                  className="cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity"
                  onPointerDown={(e) => handlePointerDown(e, i)}
                />
                <text
                  x={12}
                  y={4}
                  fill={COLORS[i % COLORS.length]}
                  fontSize={14}
                  fontWeight="bold"
                  className="pointer-events-none select-none drop-shadow-md"
                >
                  {store.isRootsMode ? `r${i+1}` : `c${i}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
