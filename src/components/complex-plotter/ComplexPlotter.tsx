"use client";

import React, { useRef, useEffect, useState } from 'react';
import { initializeScene, drawScene } from './gl-code/scene';
import { parseExpression } from './gl-code/complex-functions';

export default function ComplexPlotter({ lang = 'en' }: { lang?: 'en' | 'pt' }) {
  const t = lang === 'pt' ? {
    title: 'Gráficos Complexos',
    desc: 'Coloração de domínio baseada na web.',
    expression: 'Expressão f(z)',
    zoom: 'Nível de Zoom',
    colorMode: 'Modo de Cor',
    cartesian: 'Grade Cartesiana',
    polar: 'Grade Polar',
    varC: 'Variável "c" (Re, Im)',
    adapted: 'Adaptado do Complex Function Plotter de Samuel J. Li (wgxli).',
    repo: 'Repositório Original',
    graphicsOptions: 'Opções Gráficas',
    enableAxes: 'Exibir Eixos de Coordenadas',
    enableCheckerboard: 'Ativar Grade Xadrez',
    invertGradient: 'Inverter Gradiente',
    continuousGradient: 'Usar Gradiente Contínuo'
  } : {
    title: 'Complex Plotter',
    desc: 'Web-based domain coloring.',
    expression: 'Expression f(z)',
    zoom: 'Zoom Scale',
    colorMode: 'Color Mode',
    cartesian: 'Cartesian Grid',
    polar: 'Polar Grid',
    varC: 'Variable "c" (Re, Im)',
    adapted: 'Adapted from Complex Function Plotter by Samuel J. Li (wgxli).',
    repo: 'Original Repository',
    graphicsOptions: 'Graphics Options',
    enableAxes: 'Display Coordinate Axes',
    enableCheckerboard: 'Enable Checkerboard Grid',
    invertGradient: 'Invert Gradient',
    continuousGradient: 'Use Continuous Gradient'
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axesCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [expression, setExpression] = useState("z^2 + c");
  const [variables, setVariables] = useState<any>({
    log_scale: [1.2, 0], // Scale zoom
    center_x: [0, 0],
    center_y: [0, 0],
    enable_axes: [1, 0], // Enable axes/labels
    enable_checkerboard: [0, 0], // Disables checkerboard by default for raw aesthetic
    invert_gradient: [1, 0], // Default to 1 (inverted magnitude gradient) for perfect dark-theme aesthetics
    continuous_gradient: [1, 0], // Smooth gradient
    custom_function: [0, 0],
    grid_type: [1, 0], // Cartesian/polar grid type
    c: [0.35, 0.45], // Complex constant "c" values
  });

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [centerStart, setCenterStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Use a ResizeObserver on the canvas container to dynamically monitor layout updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Combined WebGL sizing, compilation, and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const axesCanvas = axesCanvasRef.current;
    if (!canvas || !axesCanvas || dimensions.width === 0 || dimensions.height === 0) return;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;
    const ctx = axesCanvas.getContext('2d');

    const ext = gl.getExtension('OES_standard_derivatives');
    if (!ext) {
       console.warn('OES_standard_derivatives not supported');
    }

    // Explicitly set width/height on the canvases multiplied by devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    axesCanvas.width = dimensions.width * dpr;
    axesCanvas.height = dimensions.height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    let ast;
    try {
        // Solve the blank canvas: use parseExpression (which runs nearley parser) instead of raw compile
        ast = parseExpression(expression);
        if (!ast) {
           setError("Parsing Error");
           return;
        }
        setError(null);
    } catch(err) {
        setError("Compilation Error");
        return;
    }

    const varNames = Object.keys(variables);
    const customShader = false; 
    
    // Re-compile scene using the dynamically sized drawing buffer dimensions for perfect math centering!
    const varLocations: any = initializeScene(gl, ast, customShader, varNames);
    if (!varLocations) {
       setError("Shader Error");
       return;
    }

    let animationFrameId: number;

    const render = () => {
      // transform variables to [location, value] array format expected by scene.js
      const variablesForScene: any = {};
      for (const k of varNames) {
         // CRITICAL: WebGL uniform setters expect scalar floats. Extract variables[k][0]
         // If a variable is client-only (like enable_axes), pass null as the location to prevent crashes
         variablesForScene[k] = [varLocations[k] || null, variables[k][0]];
      }
      
      if (ctx) {
        drawScene(gl, variablesForScene, ctx);
      }
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [expression, variables, dimensions]);

  // Non-passive wheel event listener to lock page scroll during zoom
  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault(); // Lock page scroll

      setVariables((prev: any) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const nextLogScale = Math.min(Math.max(prev.log_scale[0] + delta, -4), 8);
        return {
          ...prev,
          log_scale: [nextLogScale, 0]
        };
      });
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Left click drag only
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCenterStart({ x: variables.center_x[0], y: variables.center_y[0] });
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const scale = Math.exp(variables.log_scale[0]);
    
    setVariables((prev: any) => ({
      ...prev,
      center_x: [centerStart.x - dx / scale, 0],
      center_y: [centerStart.y + dy / scale, 0]
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100 font-sans shadow-2xl">
      {/* Sidebar controls */}
      <div className="w-full md:w-80 border-r border-zinc-800/60 p-6 overflow-y-auto bg-zinc-900/50 backdrop-blur-md z-10 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-zinc-100">{t.title}</h2>
          <p className="text-sm text-zinc-400">{t.desc}</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-zinc-300">{t.expression}</label>
            <input 
              type="text" 
              className="w-full bg-zinc-950/50 border border-zinc-700/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all rounded p-2.5 text-sm font-mono text-emerald-400"
              value={expression}
              onChange={e => setExpression(e.target.value)}
            />
            {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-zinc-300">{t.zoom}</label>
            <input 
              type="range" min="-3" max="3" step="0.05"
              value={variables.log_scale[0]}
              onChange={e => setVariables({...variables, log_scale: [parseFloat(e.target.value), 0]})}
              className="w-full accent-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1 text-zinc-300">{t.colorMode}</label>
            <select 
              className="w-full bg-zinc-950/50 border border-zinc-700/50 focus:border-emerald-500 outline-none transition-all rounded p-2.5 text-sm"
              value={variables.grid_type[0]}
              onChange={e => setVariables({...variables, grid_type: [parseFloat(e.target.value), 0]})}
            >
              <option value={1}>{t.cartesian}</option>
              <option value={0}>{t.polar}</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-semibold mb-1 text-zinc-300">{t.varC}</label>
            <div className="flex gap-2">
              <input 
                type="number" step="0.1"
                value={variables.c[0]}
                onChange={e => setVariables({...variables, c: [parseFloat(e.target.value), variables.c[1]]})}
                className="w-full bg-zinc-950/50 border border-zinc-700/50 rounded p-2 text-sm font-mono text-zinc-200"
              />
              <input 
                type="number" step="0.1"
                value={variables.c[1]}
                onChange={e => setVariables({...variables, c: [variables.c[0], parseFloat(e.target.value)]})}
                className="w-full bg-zinc-950/50 border border-zinc-700/50 rounded p-2 text-sm font-mono text-zinc-200"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/60 space-y-3">
            <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {t.graphicsOptions}
            </label>

            {/* Enable Axes */}
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-300 select-none hover:text-zinc-100 transition-colors">
              <input 
                type="checkbox"
                checked={variables.enable_axes[0] > 0.5}
                onChange={e => setVariables({
                  ...variables,
                  enable_axes: [e.target.checked ? 1 : 0, 0]
                })}
                className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4 accent-emerald-500"
              />
              {t.enableAxes}
            </label>

            {/* Enable Checkerboard */}
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-300 select-none hover:text-zinc-100 transition-colors">
              <input 
                type="checkbox"
                checked={variables.enable_checkerboard[0] > 0.5}
                onChange={e => setVariables({
                  ...variables,
                  enable_checkerboard: [e.target.checked ? 1 : 0, 0]
                })}
                className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4 accent-emerald-500"
              />
              {t.enableCheckerboard}
            </label>

            {/* Invert Gradient */}
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-300 select-none hover:text-zinc-100 transition-colors">
              <input 
                type="checkbox"
                checked={variables.invert_gradient[0] > 0.5}
                onChange={e => setVariables({
                  ...variables,
                  invert_gradient: [e.target.checked ? 1 : 0, 0]
                })}
                className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4 accent-emerald-500"
              />
              {t.invertGradient}
            </label>

            {/* Continuous Gradient */}
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-300 select-none hover:text-zinc-100 transition-colors">
              <input 
                type="checkbox"
                checked={variables.continuous_gradient[0] > 0.5}
                onChange={e => setVariables({
                  ...variables,
                  continuous_gradient: [e.target.checked ? 1 : 0, 0]
                })}
                className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4 accent-emerald-500"
              />
              {t.continuousGradient}
            </label>
          </div>
        </div>

        <div className="mt-auto pt-6 text-xs text-zinc-500 border-t border-zinc-800/60 leading-relaxed">
          {t.adapted} <br/>
          <a href="https://github.com/wgxli/complex-function-plotter" target="_blank" rel="noopener noreferrer" className="text-emerald-400/80 hover:text-emerald-400 underline decoration-emerald-500/30 transition-colors">{t.repo}</a>
        </div>
      </div>
      
      {/* Canvas Area */}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-1 relative overflow-hidden bg-black cursor-grab active:cursor-grabbing"
      >
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full block"
        />
        <canvas 
          ref={axesCanvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none block"
        />
      </div>
    </div>
  );
}
