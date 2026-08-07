"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

interface InteractiveHeroProps {
  lang: "en" | "pt";
}

export default function InteractiveHero({ lang }: InteractiveHeroProps) {
  const isPt = lang === "pt";
  
  const dict = {
    en: {
      tag: "⚡ Computational Showcase",
      title: "NodeGraft Engine / PolyGraft 3D",
      desc: "An interactive, real-time procedural 3D model generator driven by WebGPU. Solves mathematical Signed Distance Fields (SDF) and extracts hard-surface polygonal meshes in your browser with zero server costs.",
      btn: "Launch NodeGraft Workspace →",
      interactiveLabel: "Hover & scroll to warp the background mathematical mesh field.",
    },
    pt: {
      tag: "⚡ Demonstração Computacional",
      title: "Motor NodeGraft / PolyGraft 3D",
      desc: "Gerador procedural 3D interativo de modelos alimentado por WebGPU. Resolve matematicamente Campos de Distância com Sinal (SDF) e extrai malhas poligonais rígidas em tempo real direto no seu navegador com custo zero de servidor.",
      btn: "Abrir Workspace NodeGraft →",
      interactiveLabel: "Passe o mouse e deslize a tela para deformar a malha matemática ao fundo.",
    }
  };

  const t = isPt ? dict.pt : dict.en;

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mini3DCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [vibrationScale, setVibrationScale] = useState(1.0);
  const [isHoveredMini3D, setIsHoveredMini3D] = useState(false);

  // Background Mesh nodes state
  const nodes = useRef<Node[]>([]);
  const mouse = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  // 3D Mini Wireframe angle state
  const rotationAngle = useRef(0);

  // Initialize nodes on background canvas
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = 350;

      // Initialize grid nodes
      const spacing = 35;
      const cols = Math.floor(canvas.width / spacing) + 2;
      const rows = Math.floor(canvas.height / spacing) + 2;
      const newNodes: Node[] = [];

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing - 10;
          const y = j * spacing - 10;
          newNodes.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
          });
        }
      }
      nodes.current = newNodes;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.targetX = e.clientX - rect.left;
      mouse.current.targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.current.targetX = -1000;
      mouse.current.targetY = -1000;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("mouseleave", handleMouseLeave);
    }

    // Scroll Listener (vibrates mesh)
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVibrationScale(Math.min(3.5, 1.0 + scrollY * 0.008));
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("scroll", handleScroll);
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  // Frame Loop for Background Mesh & Mini 3D Preview
  useEffect(() => {
    let animFrameId: number;

    const tick = () => {
      // 1. Draw Background Mesh Canvas
      const bgCanvas = bgCanvasRef.current;
      if (bgCanvas) {
        const ctx = bgCanvas.getContext("2d");
        if (ctx) {
          const w = bgCanvas.width;
          const h = bgCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Interpolate mouse smoothly
          mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.1;
          mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.1;

          // Update nodes physics
          nodes.current.forEach((n) => {
            // Spring force back to base position
            const k = 0.04; // stiffness
            const damping = 0.88;
            const fSpringX = (n.baseX - n.x) * k;
            const fSpringY = (n.baseY - n.y) * k;

            n.vx = (n.vx + fSpringX) * damping;
            n.vy = (n.vy + fSpringY) * damping;

            // Attracted/Repelled by mouse movement
            if (mouse.current.x > 0 && mouse.current.y > 0) {
              const dx = mouse.current.x - n.x;
              const dy = mouse.current.y - n.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 140) {
                const force = (140 - dist) / 140;
                // Deforms grid by pushing away from mouse
                n.vx -= (dx / dist) * force * 1.5;
                n.vy -= (dy / dist) * force * 1.5;
              }
            }

            // Scroll-induced micro vibration
            if (vibrationScale > 1.05) {
              n.x += (Math.random() - 0.5) * (vibrationScale - 1.0) * 1.1;
              n.y += (Math.random() - 0.5) * (vibrationScale - 1.0) * 1.1;
            }

            n.x += n.vx;
            n.y += n.vy;
          });

          // Draw grid connections
          ctx.strokeStyle = "rgba(16, 185, 129, 0.08)"; // emerald-500 low opacity
          ctx.lineWidth = 0.75;
          const spacing = 35;
          const cols = Math.floor(w / spacing) + 2;

          for (let i = 0; i < nodes.current.length; i++) {
            const n = nodes.current[i];

            // Connect right neighbor
            if ((i + 1) % cols !== 0 && i + 1 < nodes.current.length) {
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(nodes.current[i + 1].x, nodes.current[i + 1].y);
              ctx.stroke();
            }

            // Connect down neighbor
            if (i + cols < nodes.current.length) {
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(nodes.current[i + cols].x, nodes.current[i + cols].y);
              ctx.stroke();
            }
          }

          // Draw small active dots near mouse
          nodes.current.forEach((n) => {
            const dx = mouse.current.x - n.x;
            const dy = mouse.current.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 90) {
              ctx.fillStyle = `rgba(16, 185, 129, ${0.4 * (1 - dist / 90)})`;
              ctx.beginPath();
              ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }

      // 2. Draw Mini 3D Wireframe Preview (Rotates procedurally)
      const miniCanvas = mini3DCanvasRef.current;
      if (miniCanvas) {
        const mCtx = miniCanvas.getContext("2d");
        if (mCtx) {
          const w = miniCanvas.width;
          const h = miniCanvas.height;
          mCtx.clearRect(0, 0, w, h);

          // Update angle
          const speed = isHoveredMini3D ? 0.045 : 0.012;
          rotationAngle.current = (rotationAngle.current + speed) % (Math.PI * 2);

          // Define a mathematical 3D cube / gyroid wireframe representation
          const vertices: [number, number, number][] = [];
          const lines: [number, number][] = [];

          // Generate spinning wireframe torus/core math
          const torusR = 25;
          const tubeR = 11;
          const segmentsMajor = 10;
          const segmentsMinor = 8;

          for (let i = 0; i < segmentsMajor; i++) {
            const theta = (i / segmentsMajor) * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            for (let j = 0; j < segmentsMinor; j++) {
              const phi = (j / segmentsMinor) * Math.PI * 2;
              const cosP = Math.cos(phi);
              const sinP = Math.sin(phi);

              const x = (torusR + tubeR * cosP) * cosT;
              const y = tubeR * sinP;
              const z = (torusR + tubeR * cosP) * sinT;

              vertices.push([x, y, z]);

              // Connections indexes
              const currentIdx = i * segmentsMinor + j;
              const nextMinorIdx = i * segmentsMinor + ((j + 1) % segmentsMinor);
              const nextMajorIdx = ((i + 1) % segmentsMajor) * segmentsMinor + j;

              lines.push([currentIdx, nextMinorIdx]);
              lines.push([currentIdx, nextMajorIdx]);
            }
          }

          // Project 3D to 2D
          const cosR = Math.cos(rotationAngle.current);
          const sinR = Math.sin(rotationAngle.current);
          const cosP = Math.cos(0.5); // Fixed pitch
          const sinP = Math.sin(0.5);

          const projected = vertices.map(([x, y, z]) => {
            // Y-axis rotation
            let rx = x * cosR - z * sinR;
            let rz = x * sinR + z * cosR;
            // X-axis rotation
            let ry = y * cosP - rz * sinP;
            let rz2 = y * sinP + rz * cosP;

            const distance = 100;
            const fov = 110;
            const sx = w / 2 + (rx * fov) / (rz2 + distance);
            const sy = h / 2 - (ry * fov) / (rz2 + distance);
            return [sx, sy];
          });

          // Draw Wireframe Lines
          mCtx.strokeStyle = isHoveredMini3D
            ? "rgba(52, 211, 153, 0.75)" // emerald-400
            : "rgba(16, 185, 129, 0.4)";  // emerald-500
          mCtx.lineWidth = isHoveredMini3D ? 1.25 : 0.85;

          lines.forEach(([start, end]) => {
            const pS = projected[start];
            const pE = projected[end];
            mCtx.beginPath();
            mCtx.moveTo(pS[0], pS[1]);
            mCtx.lineTo(pE[0], pE[1]);
            mCtx.stroke();
          });
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [vibrationScale, isHoveredMini3D]);

  return (
    <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/10 shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-8 min-h-[350px] mb-10 transition-all select-none">
      {/* Background Interactive Mesh Canvas */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Description Overlay Content */}
      <div className="space-y-4 flex-1 z-10 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/15">
            {t.tag}
          </span>
          {vibrationScale > 1.05 && (
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 animate-pulse">
              Scroll Modulation: x{vibrationScale.toFixed(1)}
            </span>
          )}
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
          {t.title}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-base max-w-2xl">
          {t.desc}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
          <Link
            href={`/${lang}/projects/nodegraft`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm group"
          >
            <span>{t.btn}</span>
          </Link>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-serif max-w-[200px] leading-normal italic">
            {t.interactiveLabel}
          </span>
        </div>
      </div>

      {/* Interactive spinning 3D Wireframe Mini Canvas (Clicking it launches NodeGraft too!) */}
      <Link
        href={`/${lang}/projects/nodegraft`}
        onMouseEnter={() => setIsHoveredMini3D(true)}
        onMouseLeave={() => setIsHoveredMini3D(false)}
        className="relative flex items-center justify-center w-[160px] h-[160px] bg-zinc-950 dark:bg-zinc-950 rounded-2xl border border-zinc-800 shrink-0 cursor-pointer group shadow-inner z-10 overflow-hidden"
      >
        <canvas
          ref={mini3DCanvasRef}
          width={160}
          height={160}
          className="w-full h-full pointer-events-none transition-transform group-hover:scale-105 duration-300"
        />
        <div className="absolute inset-0 bg-emerald-500/[0.01] group-hover:bg-emerald-500/[0.03] transition-colors" />
        <span className="absolute bottom-2 font-mono text-[8px] tracking-widest text-zinc-500 uppercase opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 transition-all duration-300">
          LAUNCH ENGINE
        </span>
      </Link>
    </div>
  );
}
