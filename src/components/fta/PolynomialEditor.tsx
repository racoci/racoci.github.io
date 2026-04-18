'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useStore, updateCoefficient, updateRoot, addRoot, removeRoot, addCoefficient, removeCoefficient, setFractionDepth, Complex, formatComplexFraction, parseComplex } from './store';
import { InteractivePlane } from './InteractivePlane';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6'];

const ComplexInput = ({ value, onChange, color, depth, prefix = '', suffix = '' }: { value: Complex, onChange: (c: Complex) => void, color: string, depth: number, prefix?: string, suffix?: string }) => {
  const displayStr = formatComplexFraction(value, depth);
  const needsParens = value.re !== 0 && value.im !== 0;

  const parseStrIntoNodes = (s: string) => {
    return s.split(/(\d+\/\d+|\d+\.\d+|\d+)/);
  };

  const [parts, setParts] = useState(() => parseStrIntoNodes(displayStr));

  useEffect(() => {
    setParts(parseStrIntoNodes(displayStr));
  }, [displayStr]);

  const handlePartChange = (index: number, newValue: string) => {
    const newParts = [...parts];
    newParts[index] = newValue;
    setParts(newParts);
  };

  const commit = () => {
    const fullStr = parts.join('');
    onChange(parseComplex(fullStr));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    }
  };

  return (
    <span className="inline-flex items-center" style={{ color }}>
      {prefix}
      {needsParens && !prefix && <span>(</span>}
      {parts.map((part, i) => {
        const isFrac = part.includes('/');
        if (isFrac) {
          const splitIdx = part.indexOf('/');
          const num = part.slice(0, splitIdx);
          const den = part.slice(splitIdx + 1);
          return (
            <span key={i} className="inline-flex flex-col items-center justify-center align-middle mx-[2px] translate-y-[0.1em]">
              <input 
                className="bg-transparent text-center outline-none border-b border-current p-0 m-0 leading-none" 
                style={{ width: Math.max(num.length, 1) + 'ch', color: 'inherit', fontSize: '0.8em' }} 
                value={num} 
                onChange={e => handlePartChange(i, `${e.target.value}/${den}`)} 
                onBlur={commit}
                onKeyDown={handleKeyDown}
              />
              <input 
                className="bg-transparent text-center outline-none p-0 m-0 leading-none" 
                style={{ width: Math.max(den.length, 1) + 'ch', color: 'inherit', fontSize: '0.8em' }} 
                value={den} 
                onChange={e => handlePartChange(i, `${num}/${e.target.value}`)} 
                onBlur={commit}
                onKeyDown={handleKeyDown}
              />
            </span>
          );
        } else {
          // Normal text part (can be operators, 'i', or integers/decimals)
          return (
            <input 
              key={i}
              className="bg-transparent text-center outline-none p-0 m-0 leading-none" 
              style={{ width: part.length > 0 ? part.length + 'ch' : '0.5ch', color: 'inherit' }} 
              value={part} 
              onChange={e => handlePartChange(i, e.target.value)} 
              onBlur={commit}
              onKeyDown={handleKeyDown}
            />
          );
        }
      })}
      {needsParens && !prefix && <span>)</span>}
      {suffix}
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
    <div className="flex flex-col items-center gap-6 my-8 p-4 md:p-6 border rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm w-full max-w-none xl:max-w-[1200px] mx-auto">
      <div className="flex flex-row justify-between w-full">
        <h3 className="text-xl font-bold">Polynomial Editor</h3>
      </div>

      <div className="flex items-center justify-between w-full max-w-md gap-4 bg-white dark:bg-black p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <span className="text-sm font-medium whitespace-nowrap">Fraction Complexity:</span>
        <input 
          type="range" min="1" max="10" step="1"
          value={store.fractionDepth} 
          onChange={e => setFractionDepth(Math.max(1, parseInt(e.target.value) || 1))}
          className="flex-1"
        />
        <input 
          type="number" min="1"
          value={store.fractionDepth}
          onChange={e => setFractionDepth(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-center outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-stretch">
        {/* Left Column: Coefficients */}
        <div className="flex flex-col gap-4 items-center w-full h-full">
          <div className="text-lg font-mono tracking-wider overflow-x-auto w-full text-center py-4 bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800 min-h-[5rem] flex flex-1 items-center justify-center">
            <span className="font-bold">P(z) =&nbsp;</span>
            <div className="inline-flex flex-wrap justify-center items-center gap-2">
              {(() => {
                const visible = store.coefficients.map((c, i) => ({c, i})).filter(({c}) => Math.abs(c.re) >= 1e-6 || Math.abs(c.im) >= 1e-6).reverse();
                if (visible.length === 0) return <span>0</span>;
                return visible.map(({c, i}, displayIndex) => (
                  <span key={i} className="whitespace-nowrap flex items-center">
                    {displayIndex > 0 && <span className="mx-1">+</span>}
                    <ComplexInput value={c} onChange={v => updateCoefficient(i, v)} color={COLORS[i % COLORS.length]} depth={store.fractionDepth} />
                    {i > 0 && <span>z{i > 1 && <sup>{i}</sup>}</span>}
                  </span>
                ));
              })()}
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
        <div className="flex flex-col gap-4 items-center w-full h-full">
          <div className="text-lg font-mono tracking-wider overflow-x-auto w-full text-center py-4 bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800 min-h-[5rem] flex flex-1 items-center justify-center">
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
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const bounds = useMemo(() => {
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
    if (minX === Infinity) return { minX: -5, maxX: 5, minY: -5, maxY: 5 };
    return { minX, maxX, minY, maxY };
  }, [pts]);

  const handlePointPointerDown = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingIdx(idx);
    setSelectedPoint({ type, idx });
  };

  return (
    <div className="relative border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black shadow-inner overflow-hidden touch-none select-none w-full flex justify-center">
      <InteractivePlane 
        dataBounds={bounds} 
        padding={1.5}
        width="100%" 
        height="100%" 
        style={{ aspectRatio: '1/1' }}
        onDoubleClick={(e) => {
           // We can get the coordinate using getScreenCTM... but we don't have screenToMath here easily unless we pass it up or do it in children
           // But since we can just do it in a wrapper inside InteractivePlane:
        }}
      >
        {({ screenToMath, viewBox }) => {
          
          const step = viewBox.w > 20 ? 5 : viewBox.w > 5 ? 1 : 0.2;
          const startX = Math.floor(viewBox.x / step) * step;
          const startY = Math.floor(viewBox.y / step) * step;
          const gridLines = [];
          
          for (let x = startX; x <= viewBox.x + viewBox.w; x += step) {
            gridLines.push(<line key={`vx${x}`} x1={x} y1={viewBox.y} x2={x} y2={viewBox.y + viewBox.h} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={x===0 ? viewBox.w/100 : viewBox.w/300} />);
          }
          for (let y = startY; y <= viewBox.y + viewBox.h; y += step) {
            gridLines.push(<line key={`hy${y}`} x1={viewBox.x} y1={y} x2={viewBox.x + viewBox.w} y2={y} stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth={y===0 ? viewBox.w/100 : viewBox.w/300} />);
          }

          return (
            <g 
              onDoubleClick={(e) => {
                const pt = screenToMath(e.clientX, e.clientY);
                onAdd({ re: pt.x, im: pt.y });
              }}
              onPointerMove={(e) => {
                if (draggingIdx !== null) {
                  const pt = screenToMath(e.clientX, e.clientY);
                  onUpdate(draggingIdx, { re: pt.x, im: pt.y });
                }
              }}
              onPointerUp={() => setDraggingIdx(null)}
              onPointerLeave={() => setDraggingIdx(null)}
            >
              <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="transparent" />
              {gridLines}
              <circle cx={0} cy={0} r={1} fill="none" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeDasharray={`${viewBox.w/100} ${viewBox.w/100}`} strokeWidth={viewBox.w/200} />
              
              {pts.map((pt, i) => {
                const isSelected = selectedPoint?.type === type && selectedPoint?.idx === i;
                return (
                  <g key={i} transform={`translate(${pt.re}, ${-pt.im})`}>
                    {isSelected && <circle r={viewBox.w/20} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={viewBox.w/150} className="animate-pulse" />}
                    <circle
                      r={isSelected ? viewBox.w/30 : viewBox.w/40}
                      fill={COLORS[i % COLORS.length]}
                      className="cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity drop-shadow"
                      onPointerDown={(e) => handlePointPointerDown(e, i)}
                    />
                    {/* Since y is flipped (-im), text will be normal, not flipped, because InteractivePlane viewBox has y natively SVG-oriented. We just draw at -pt.im */}
                    <text
                      x={viewBox.w/30 + viewBox.w/100}
                      y={viewBox.w/80}
                      fill={COLORS[i % COLORS.length]}
                      fontSize={viewBox.w/25}
                      fontWeight="bold"
                      className="pointer-events-none select-none drop-shadow-md"
                    >
                      {type === 'root' ? `r${i+1}` : `c${i}`}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        }}
      </InteractivePlane>
    </div>
  );
}
