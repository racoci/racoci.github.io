"use client";

import React, { useRef, useEffect, useState } from "react";
import { InlineMath, BlockMath } from "react-katex";

export function HueMapVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCartesian, setShowCartesian] = useState(true);
  const [showPolar, setShowPolar] = useState(true);
  const [scaleMode, setScaleMode] = useState<"linear" | "log_polar">("log_polar");
  const [zoom, setZoom] = useState<number>(3);
  const [hoverVal, setHoverVal] = useState<{ x: number; y: number; r: number; theta: number } | null>(null);

  // Helper: HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    // Draw background pixels
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        // Center-relative coordinates
        let dx = (px - cx) / cx; // [-1, 1]
        let dy = (cy - py) / cy; // [-1, 1]

        let r = Math.sqrt(dx * dx + dy * dy);
        let theta = Math.atan2(dy, dx);

        // Apply scale mappings
        let mag = 0;
        if (scaleMode === "linear") {
          mag = r * zoom;
        } else {
          // Log-Polar: map radial distance exponentially
          mag = Math.exp(r * Math.log(zoom + 1)) - 1.0;
        }

        // Color based on continuous phase (Hue = phase, Saturation = 0.8, Value = magnitude)
        const h = (theta + Math.PI) / (Math.PI * 2.0); // [0, 1]
        const s = 0.85;
        const v = 1.0 - Math.exp(-mag); // asymptotic compression

        const [rgbR, rgbG, rgbB] = hsvToRgb(h, s, v);
        const idx = (py * W + px) * 4;
        data[idx] = rgbR;
        data[idx + 1] = rgbG;
        data[idx + 2] = rgbB;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw Grids over the canvas
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    // 1. Cartesian Grid
    if (showCartesian) {
      const step = W / 8;
      for (let x = step; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = step; y < H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    // 2. Polar Grid
    if (showPolar) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      // Circles
      for (let r = 30; r < cx; r += 30) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Rays
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + cx * Math.cos(ang), cy - cy * Math.sin(ang));
        ctx.stroke();
      }
    }

    // Bold Axis
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.stroke();

  }, [showCartesian, showPolar, scaleMode, zoom]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const dx = (px - cx) / cx;
    const dy = (cy - py) / cy;

    const r_disp = Math.sqrt(dx * dx + dy * dy);
    const theta = Math.atan2(dy, dx);

    let r = 0;
    if (scaleMode === "linear") {
      r = r_disp * zoom;
    } else {
      r = Math.exp(r_disp * Math.log(zoom + 1)) - 1.0;
    }

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    setHoverVal({ x, y, r, theta });
  };

  return (
    <div className="my-8 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl font-sans">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Canvas Render Area */}
        <div className="relative flex flex-col items-center justify-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverVal(null)}
            className="rounded-lg border border-zinc-800 cursor-crosshair"
          />
          <div className="text-zinc-500 text-[10px] mt-2 uppercase tracking-wider font-mono">
            Plano de Gauss: Hue-Map (Polar)
          </div>
        </div>

        {/* Control & Math Panel */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-emerald-400 font-bold text-base md:text-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Codificação 1: HSV Hue-Map
            </h3>
            <p className="text-zinc-400 text-xs md:text-sm mt-1 leading-relaxed">
              Mapeia o argumento complexo (ângulo) continuamente no espectro de matizes (arco-íris). A magnitude orienta o brilho/saturação de forma assintótica.
            </p>
          </div>

          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 space-y-3 font-mono text-[11px] text-zinc-400">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider border-b border-zinc-800 pb-1">
              Controle de Escala e Grade
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setScaleMode("linear")}
                className={`px-2 py-1 rounded border transition-colors ${
                  scaleMode === "linear" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-900/60 hover:bg-zinc-800 border-transparent"
                }`}
              >
                Linear
              </button>
              <button
                onClick={() => setScaleMode("log_polar")}
                className={`px-2 py-1 rounded border transition-colors ${
                  scaleMode === "log_polar" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-900/60 hover:bg-zinc-800 border-transparent"
                }`}
              >
                Log-Polar (Ideal)
              </button>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showCartesian} onChange={() => setShowCartesian(!showCartesian)} className="accent-emerald-500" />
                <span>Grade Cartesiana</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showPolar} onChange={() => setShowPolar(!showPolar)} className="accent-emerald-500" />
                <span>Grade Polar</span>
              </label>
            </div>

            <div>
              <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Fator de Escala (Zoom): {zoom}</label>
              <input type="range" min="1" max="15" value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))} className="w-full accent-emerald-500" />
            </div>
          </div>

          {/* Mouse Inspector */}
          <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/40 h-24 flex flex-col justify-center">
            {hoverVal ? (
              <div className="font-mono text-xs space-y-1">
                <div>Coordenada z: <span className="text-emerald-400 font-bold">{hoverVal.x.toFixed(3)} + {hoverVal.y.toFixed(3)}i</span></div>
                <div className="grid grid-cols-2 text-[10px] text-zinc-400">
                  <div>Magnitude |z|: <span className="text-zinc-200">{hoverVal.r.toFixed(3)}</span></div>
                  <div>Fase θ: <span className="text-zinc-200">{(hoverVal.theta * 180 / Math.PI).toFixed(1)}°</span></div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-xs italic font-mono text-center">
                Passe o mouse no plano para ler os valores complexos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}