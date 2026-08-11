'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useStore, updateCoefficient, updateRoot, addRoot, removeRoot, addCoefficient, removeCoefficient, setFractionDepth, Complex, formatComplexFraction, parseComplex, cAbs } from './store';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6'];

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
  const [selectedPoint, setSelectedPoint] = useState<{type: 'root' | 'coeff', idx: number} | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedPoint) {
        if (selectedPoint.type === 'root') {
          removeRoot(selectedPoint.idx);
        } else {
          removeCoefficient(selectedPoint.idx);
        }
        setSelectedPoint(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPoint]);

  return (
    <div className="flex flex-col items-center gap-6 my-8 p-4 md:p-6 border rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm w-full max-w-5xl mx-auto">
      <div className="flex flex-row justify-between w-full">
        <h3 className="text-xl font-bold">Polynomial Editor</h3>
      </div>

      <label className="flex items-center justify-between w-full max-w-xs gap-4">
        <span className="text-sm font-medium whitespace-nowrap">Fraction Complexity: {store.fractionDepth}</span>
        <input 
          type="range" min="0" max="5" 
          value={store.fractionDepth} 
          onChange={e => setFractionDepth(parseInt(e.target.value))}
          className="flex-1"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Left Column: Coefficients */}
        <div className="flex flex-col gap-4 items-center w-full">
          <div className="text-lg font-mono tracking-wider overflow-x-auto w-full text-center py-4 bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800 min-h-[5rem] flex items-center justify-center">
            <span className="font-bold">P(z) =&nbsp;</span>
            <div className="inline-flex flex-wrap justify-center items-center gap-2">
              {store.coefficients.map((c, i) => {
                if (c.re === 0 && c.im === 0) return null;
                return (
                  <span key={i} className="whitespace-nowrap flex items-center">
                    {i < store.coefficients.length - 1 ? <span className="mx-1">+</span> : ''}
                    <ComplexInput value={c} onChange={v => updateCoefficient(i, v)} color={COLORS[i % COLORS.length]} depth={store.fractionDepth} />
                    {i > 0 && <span>z{i > 1 && <sup>{i}</sup>}</span>}
                  </span>
                );
              }).reverse()}
              {store.coefficients.every(c => c.re === 0 && c.im === 0) && <span>0</span>}
            </div>
          </div>
          <PlaneEditor 
            pts={store.coefficients} 
            type="coeff" 
            onUpdate={updateCoefficient} 
            onAdd={addCoefficient}
            selectedPoint={selectedPoint}
            setSelectedPoint={setSelectedPoint}
          />
        </div>

        {/* Right Column: Roots */}
        <div className="flex flex-col gap-4 items-center w-full">
          <div className="text-lg font-mono tracking-wider overflow-x-auto w-full text-center py-4 bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800 min-h-[5rem] flex items-center justify-center">
            <span className="font-bold">P(z) =&nbsp;</span>
            <div className="inline-flex flex-wrap justify-center items-center gap-1">
              {store.roots.length === 0 ? <span>1</span> : null}
              {store.roots.map((r, i) => (
                <span key={i} className="whitespace-nowrap flex items-center">
                  (z - <ComplexInput value={r} onChange={v => updateRoot(i, v)} color={COLORS[i % COLORS.length]} depth={store.fractionDepth} />)
                </span>
              ))}
            </div>
          </div>
          <PlaneEditor 
            pts={store.roots} 
            type="root" 
            onUpdate={updateRoot} 
            onAdd={addRoot}
            selectedPoint={selectedPoint}
            setSelectedPoint={setSelectedPoint}
          />
        </div>
      </div>
    </div>
  );
}

function PlaneEditor({ pts, type, onUpdate, onAdd, selectedPoint, setSelectedPoint }: { 
  pts: Complex[], 
  type: 'root' | 'coeff', 
  onUpdate: (idx: number, v: Complex) => void,
  onAdd: (v: Complex) => void,
  selectedPoint: {type: 'root' | 'coeff', idx: number} | null,
  setSelectedPoint: (v: {type: 'root' | 'coeff', idx: number} | null) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(100); // px per unit
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const width = 400;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;

  const toScreen = (c: Complex) => ({
    x: cx + pan.x + c.re * zoom,
    y: cy + pan.y - c.im * zoom,
  });

  const fromScreen = (x: number, y: number): Complex => {
    return {
      re: (x - cx - pan.x) / zoom,
      im: (cy + pan.y - y) / zoom,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    setSelectedPoint(null);
  };

  const handlePointPointerDown = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingIdx(idx);
    setSelectedPoint({ type, idx });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdx !== null && svgRef.current) {
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      const newValue = fromScreen(cursorPt.x, cursorPt.y);
      onUpdate(draggingIdx, newValue);
    } else if (isPanning) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = () => {
    setDraggingIdx(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    // Zoom around cursor
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(10, Math.min(1000, zoom * scaleFactor));
    
    const worldX = (cursorPt.x - cx - pan.x) / zoom;
    const worldY = (cy + pan.y - cursorPt.y) / zoom;
    
    const newPanX = cursorPt.x - cx - worldX * newZoom;
    const newPanY = cursorPt.y - cy + worldY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: -newPanY });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    const newValue = fromScreen(cursorPt.x, cursorPt.y);
    onAdd(newValue);
  };

  // Draw grid
  const gridLines = [];
  const minX = fromScreen(0, 0).re;
  const maxX = fromScreen(width, 0).re;
  const minY = fromScreen(0, height).im;
  const maxY = fromScreen(0, 0).im;

  const step = zoom > 200 ? 0.5 : zoom < 50 ? 2 : 1;
  const startX = Math.floor(minX / step) * step;
  const startY = Math.floor(minY / step) * step;

  for (let x = startX; x <= maxX; x += step) {
    const sx = toScreen({re: x, im: 0}).x;
    gridLines.push(<line key={`vx${x}`} x1={sx} y1={0} x2={sx} y2={height} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={x===0 ? 2 : 1} />);
  }
  for (let y = startY; y <= maxY; y += step) {
    const sy = toScreen({re: 0, im: y}).y;
    gridLines.push(<line key={`hy${y}`} x1={0} y1={sy} x2={width} y2={sy} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={y===0 ? 2 : 1} />);
  }

  return (
    <div className="relative border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black shadow-inner overflow-hidden touch-none select-none w-full flex justify-center">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: width, maxHeight: height, width: '100%', height: 'auto', aspectRatio: '1/1' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className={isPanning ? "cursor-grabbing" : "cursor-crosshair"}
      >
        {gridLines}
        <circle cx={cx + pan.x} cy={cy + pan.y} r={zoom} fill="none" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeDasharray="4 4" />

        {/* Points */}
        {pts.map((pt, i) => {
          const { x, y } = toScreen(pt);
          const isSelected = selectedPoint?.type === type && selectedPoint?.idx === i;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              {isSelected && <circle r={12} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2} className="animate-pulse" />}
              <circle
                r={isSelected ? 8 : 6}
                fill={COLORS[i % COLORS.length]}
                className="cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity drop-shadow"
                onPointerDown={(e) => handlePointPointerDown(e, i)}
              />
              <text
                x={12}
                y={4}
                fill={COLORS[i % COLORS.length]}
                fontSize={14}
                fontWeight="bold"
                className="pointer-events-none select-none drop-shadow-md bg-white/50 dark:bg-black/50"
              >
                {type === 'root' ? `r${i+1}` : `c${i}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
