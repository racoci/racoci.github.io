"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { usePolynomial, evaluatePolynomial, Complex } from "./store";

// Helper to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

type Square = {
  x: number; // math coordinate re (bottom-left)
  y: number; // math coordinate im (bottom-left)
  size: number; // side length
  depth: number;
};

export default function QuadtreeVisualizer() {
  const coeffs = usePolynomial();

  const domainCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);

  // States
  const [activeSquare, setActiveSquare] = useState<Square>({ x: -2, y: -2, size: 4, depth: 0 });
  const [subSquares, setSubSquares] = useState<Square[] | null>(null);
  
  // Animation progress: 0 to 800 (representing 800 sampled boundary points)
  const [animationFrame, setAnimationFrame] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [verdictReached, setVerdictReached] = useState<boolean>(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);

  // Computed curves data: 4 curves, each containing 800 mapped points
  const [curves, setCurves] = useState<{ zPoints: Complex[]; pPoints: Complex[] }[]>([]);
  const [windingNumbers, setWindingNumbers] = useState<number[]>([]);

  // Viewport/Camera transitions for Domain Canvas (pan & zoom)
  const [domainCamera, setDomainCamera] = useState({ x: -2, y: -2, size: 4 });

  // Right panel auto-fit scale
  const [imageCamera, setImageCamera] = useState({ cx: 0, cy: 0, size: 4 });

  // Boundary colors matching user suggestions
  const colors = ["#06b6d4", "#ec4899", "#eab308", "#f97316"]; // Cyan, Magenta, Yellow, Orange

  // Detect language from context (defaulting to EN/PT toggle)
  const [isPt, setIsPt] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPt(window.location.pathname.includes("/pt"));
    }
  }, []);

  // High-Resolution WebGL Domain Coloring rendering loop
  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    let gl = glRef.current;
    if (!gl) {
      gl = canvas.getContext("webgl");
      if (!gl) return;
      glRef.current = gl;
    }

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width * dpr || 500;
    const h = rect.height * dpr || 500;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    if (!programRef.current) {
      const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;
        void main() {
          v_texCoord = a_position * 0.5 + 0.5;
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      const fsSource = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform vec2 u_camera_pos;
        uniform float u_camera_size;
        uniform vec2 u_coeffs[6];
        uniform int u_degree;

        const float PI = 3.141592653589793;
        const float TAU = 2.0 * PI;

        vec2 cadd(vec2 a, vec2 b) { return a + b; }
        vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          // Invert Y coordinate mapping mathematically to align with the SVG coordinates!
          vec2 z = u_camera_pos + vec2(v_texCoord.x, v_texCoord.y) * u_camera_size;
          vec2 acc = vec2(0.0);
          vec2 z_pow = vec2(1.0, 0.0);
          for (int i = 0; i < 6; i++) {
            if (i > u_degree) break;
            acc = cadd(acc, cmul(u_coeffs[i], z_pow));
            z_pow = cmul(z_pow, z);
          }
          float angle = atan(acc.y, acc.x + 1e-20);
          float hue = (angle + PI) / TAU;
          float mag = length(acc);
          float logMag = mag > 0.0 ? log(mag) / log(2.0) : 0.0;
          float lightness = 0.35 + fract(logMag) * 0.15;
          vec3 rgb = hsv2rgb(vec3(hue, 0.6, lightness));
          gl_FragColor = vec4(rgb, 0.35); // Subtle alpha (0.35)
        }
      `;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      if (!vs || !fs) return;

      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("VS compilation failed:", gl.getShaderInfoLog(vs));
        return;
      }

      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("FS compilation failed:", gl.getShaderInfoLog(fs));
        return;
      }

      const prog = gl.createProgram();
      if (!prog) return;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Linking failed:", gl.getProgramInfoLog(prog));
        return;
      }

      programRef.current = prog;
    }

    const program = programRef.current;
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const camPosLoc = gl.getUniformLocation(program, "u_camera_pos");
    const camSizeLoc = gl.getUniformLocation(program, "u_camera_size");
    const coeffsLoc = gl.getUniformLocation(program, "u_coeffs");
    const degreeLoc = gl.getUniformLocation(program, "u_degree");

    gl.uniform2f(camPosLoc, domainCamera.x, domainCamera.y);
    gl.uniform1f(camSizeLoc, domainCamera.size);

    const flatCoeffs = new Float32Array(12);
    for (let i = 0; i < 6; i++) {
      if (i < coeffs.length) {
        flatCoeffs[i * 2] = coeffs[i].re;
        flatCoeffs[i * 2 + 1] = coeffs[i].im;
      } else {
        flatCoeffs[i * 2] = 0;
        flatCoeffs[i * 2 + 1] = 0;
      }
    }
    gl.uniform2fv(coeffsLoc, flatCoeffs);
    gl.uniform1i(degreeLoc, coeffs.length - 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, [domainCamera, coeffs]);

  const t = {
    title: isPt ? "Visualizador do Teorema Fundamental (Quad-tree)" : "Fundamental Theorem Visualizer (Quadtree)",
    step: isPt ? "Próximo Passo" : "Next Step",
    reset: isPt ? "Reiniciar" : "Reset",
    depth: isPt ? "Profundidade" : "Depth",
    size: isPt ? "Tamanho" : "Size",
    activeLabel: isPt ? "Quadrado Ativo" : "Active Square",
    domainTitle: isPt ? "Domínio Complexo (z)" : "Complex Domain (z)",
    imageTitle: isPt ? "Imagem Complexa P(z)" : "Complex Image P(z)",
    scanning: isPt ? "Rastreando Índice de Rotação (Winding Number)..." : "Tracking Winding Number (Ray Tracer)...",
    verdict: isPt ? "Decisão: Quadrados mortos (Δ = 0) descartados; vencedor focado!" : "Verdict: Dead squares (Δ = 0) discarded; winner focused!",
    intro: isPt ? "Divida o plano dinamicamente e rastreie o índice de rotação (radar) ao redor de (0,0)." : "Bisect the complex domain and track the winding number radar around (0,0) in real-time."
  };

  // Generate 800 high-density boundary points for a square
  const getBoundaryPoints = (sq: Square): Complex[] => {
    const pts: Complex[] = [];
    const pointsPerEdge = 200;

    // Bottom edge (y = sq.y, moving right)
    for (let i = 0; i < pointsPerEdge; i++) {
      pts.push({ re: sq.x + (i / pointsPerEdge) * sq.size, im: sq.y });
    }
    // Right edge (x = sq.x + sq.size, moving up)
    for (let i = 0; i < pointsPerEdge; i++) {
      pts.push({ re: sq.x + sq.size, im: sq.y + (i / pointsPerEdge) * sq.size });
    }
    // Top edge (y = sq.y + sq.size, moving left)
    for (let i = 0; i < pointsPerEdge; i++) {
      pts.push({ re: sq.x + sq.size - (i / pointsPerEdge) * sq.size, im: sq.y + sq.size });
    }
    // Left edge (x = sq.x, moving down)
    for (let i = 0; i < pointsPerEdge; i++) {
      pts.push({ re: sq.x, im: sq.y + sq.size - (i / pointsPerEdge) * sq.size });
    }
    return pts;
  };

  // Trigger Bisection (Next Step)
  const handleNextStep = () => {
    if (isAnimating) return;

    // Reset bisection step states
    setVerdictReached(false);
    setWinningIndex(null);
    setAnimationFrame(0);

    const half = activeSquare.size / 2;
    const nextDepth = activeSquare.depth + 1;

    // 1. Bisect active square into 4 sub-squares
    const subs: Square[] = [
      { x: activeSquare.x, y: activeSquare.y, size: half, depth: nextDepth }, // Q1: Bottom-Left
      { x: activeSquare.x + half, y: activeSquare.y, size: half, depth: nextDepth }, // Q2: Bottom-Right
      { x: activeSquare.x, y: activeSquare.y + half, size: half, depth: nextDepth }, // Q3: Top-Left
      { x: activeSquare.x + half, y: activeSquare.y + half, size: half, depth: nextDepth } // Q4: Top-Right
    ];
    setSubSquares(subs);

    // 2. Generate and evaluate high density perimeters
    const newCurves = subs.map(sub => {
      const zPoints = getBoundaryPoints(sub);
      const pPoints = zPoints.map(z => evaluatePolynomial(coeffs, z));
      return { zPoints, pPoints };
    });
    setCurves(newCurves);

    // 3. Compute mathematically exact Winding Numbers
    const computedWindingNumbers = newCurves.map(curve => {
      let totalAngle = 0;
      for (let i = 0; i < curve.pPoints.length; i++) {
        const p0 = curve.pPoints[i];
        const p1 = curve.pPoints[(i + 1) % curve.pPoints.length];
        const theta0 = Math.atan2(p0.im, p0.re);
        const theta1 = Math.atan2(p1.im, p1.re);
        let dTheta = theta1 - theta0;
        if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
        totalAngle += dTheta;
      }
      return Math.abs(Math.round(totalAngle / (2 * Math.PI)));
    });
    setWindingNumbers(computedWindingNumbers);

    // 4. Calculate Auto-Fit zoom bounding box for Image canvas (must contain (0,0) and all curves)
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    newCurves.forEach(curve => {
      curve.pPoints.forEach(p => {
        if (p.re < minX) minX = p.re;
        if (p.re > maxX) maxX = p.re;
        if (p.im < minY) minY = p.im;
        if (p.im > maxY) maxY = p.im;
      });
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const padding = 1.25;
    const size = Math.max(maxX - minX, maxY - minY) * padding || 4;
    setImageCamera({ cx, cy, size });

    // 5. Fire radar ray-tracer animation
    setIsAnimating(true);
  };

  // Run Ray Tracer Animation Loop
  useEffect(() => {
    if (!isAnimating) return;
    let animId: number;
    const step = 8; // Number of points processed per frame to speed up scanning reasonably (800 / 8 = 100 frames)

    const tick = () => {
      setAnimationFrame(prev => {
        if (prev >= 800 - step) {
          setIsAnimating(false);
          setVerdictReached(true);
          
          // Determine the winner (first sub-square with winding number >= 1)
          const winner = windingNumbers.findIndex(wn => wn >= 1);
          if (winner !== -1) {
            setWinningIndex(winner);
          }
          return 800;
        }
        return prev + step;
      });
      animId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(animId);
  }, [isAnimating, windingNumbers]);

  // Handle zooming smoothly into winning square after verdict
  useEffect(() => {
    if (verdictReached && winningIndex !== null && subSquares) {
      const winner = subSquares[winningIndex];
      
      // Animate Camera to zoom in smoothly over 600ms
      let start: number | null = null;
      const duration = 600;
      const initialCam = { ...domainCamera };
      const targetCam = { x: winner.x, y: winner.y, size: winner.size };

      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        // Easing cubic-out
        const ease = 1 - Math.pow(1 - progress, 3);

        setDomainCamera({
          x: initialCam.x + (targetCam.x - initialCam.x) * ease,
          y: initialCam.y + (targetCam.y - initialCam.y) * ease,
          size: initialCam.size + (targetCam.size - initialCam.size) * ease
        });

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Set active square to winner for the next bisection step!
          setActiveSquare(winner);
          setSubSquares(null);
        }
      };

      requestAnimationFrame(step);
    }
  }, [verdictReached, winningIndex, subSquares]);

  // Canvas drawing loop
  useEffect(() => {
    const dCanvas = domainCanvasRef.current;
    const iCanvas = imageCanvasRef.current;
    if (!dCanvas || !iCanvas) return;

    const dCtx = dCanvas.getContext("2d");
    const iCtx = iCanvas.getContext("2d");
    if (!dCtx || !iCtx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const dRect = dCanvas.getBoundingClientRect();
    const iRect = iCanvas.getBoundingClientRect();

    const cssDWidth = dRect.width || 500;
    const cssDHeight = dRect.height || 500;
    const cssIWidth = iRect.width || 500;
    const cssIHeight = iRect.height || 500;

    const dWidth = cssDWidth * dpr;
    const dHeight = cssDHeight * dpr;
    const iWidth = cssIWidth * dpr;
    const iHeight = cssIHeight * dpr;

    if (dCanvas.width !== dWidth || dCanvas.height !== dHeight) {
      dCanvas.width = dWidth;
      dCanvas.height = dHeight;
    }
    if (iCanvas.width !== iWidth || iCanvas.height !== iHeight) {
      iCanvas.width = iWidth;
      iCanvas.height = iHeight;
    }

    // Helper to map math coordinates to domain canvas pixels (CSS)
    const mathToDomainPixel = (mx: number, my: number) => {
      const sx = ((mx - domainCamera.x) / domainCamera.size) * cssDWidth;
      const sy = cssDHeight - ((my - domainCamera.y) / domainCamera.size) * cssDHeight;
      return { x: sx, y: sy };
    };

    // Helper to map math coordinates to image canvas pixels (CSS)
    const mathToImagePixel = (mx: number, my: number) => {
      const halfSize = imageCamera.size / 2;
      const minX = imageCamera.cx - halfSize;
      const maxY = imageCamera.cy + halfSize;
      const sx = ((mx - minX) / imageCamera.size) * cssIWidth;
      const sy = ((maxY - my) / imageCamera.size) * cssIHeight;
      return { x: sx, y: sy };
    };

    // --- DRAW DOMAIN CANVAS (LEFT) ---
    dCtx.clearRect(0, 0, dWidth, dHeight);
    dCtx.save();
    dCtx.scale(dpr, dpr);

    // 2. Draw Domain Axes
    const originZ = mathToDomainPixel(0, 0);
    dCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    dCtx.lineWidth = 1;
    dCtx.beginPath();
    dCtx.moveTo(0, originZ.y); dCtx.lineTo(cssDWidth, originZ.y);
    dCtx.moveTo(originZ.x, 0); dCtx.lineTo(originZ.x, cssDHeight);
    dCtx.stroke();

    // 3. Draw Active Square boundary
    const activeBL = mathToDomainPixel(activeSquare.x, activeSquare.y);
    const activeTR = mathToDomainPixel(activeSquare.x + activeSquare.size, activeSquare.y + activeSquare.size);
    dCtx.strokeStyle = "rgba(16, 185, 129, 0.5)"; // emerald-500
    dCtx.lineWidth = 2.5;
    dCtx.strokeRect(activeBL.x, activeTR.y, activeTR.x - activeBL.x, activeBL.y - activeTR.y);

    // 4. Draw Sub-squares and highlight winner/discarded
    if (subSquares) {
      subSquares.forEach((sub, idx) => {
        const bl = mathToDomainPixel(sub.x, sub.y);
        const tr = mathToDomainPixel(sub.x + sub.size, sub.y + sub.size);
        const w = tr.x - bl.x;
        const h = bl.y - tr.y;

        if (verdictReached) {
          if (idx === winningIndex) {
            // Winning square: Flashes bright version of its quadrant color
            dCtx.fillStyle = colors[idx] + "26"; // 15% opacity fill
            dCtx.fillRect(bl.x, tr.y, w, h);
            dCtx.strokeStyle = colors[idx]; // Keep the quadrant color!
            dCtx.lineWidth = 3;
            dCtx.strokeRect(bl.x, tr.y, w, h);
          } else {
            // Discarded square: Blacked out/semi-transparent
            dCtx.fillStyle = "rgba(0, 0, 0, 0.65)";
            dCtx.fillRect(bl.x, tr.y, w, h);
            dCtx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            dCtx.lineWidth = 1;
            dCtx.strokeRect(bl.x, tr.y, w, h);
          }
        } else {
          // Bisection lines: Styled in sub-square color
          dCtx.strokeStyle = colors[idx];
          dCtx.lineWidth = 1.5;
          dCtx.strokeRect(bl.x, tr.y, w, h);
        }
      });
    }
    dCtx.restore();

    // --- DRAW IMAGE CANVAS (RIGHT) ---
    iCtx.clearRect(0, 0, iWidth, iHeight);
    iCtx.save();
    iCtx.scale(dpr, dpr);

    // 1. Draw subtle background Domain Coloring in P-plane
    const iColoringCanvas = document.createElement("canvas");
    iColoringCanvas.width = 120;
    iColoringCanvas.height = 120;
    const icCtx = iColoringCanvas.getContext("2d");
    if (icCtx) {
      const imgData = icCtx.createImageData(120, 120);
      const data = imgData.data;
      const halfSize = imageCamera.size / 2;
      const minX = imageCamera.cx - halfSize;
      const maxY = imageCamera.cy + halfSize;
      for (let py = 0; py < 120; py++) {
        const im = maxY - (py / 120) * imageCamera.size;
        for (let px = 0; px < 120; px++) {
          const re = minX + (px / 120) * imageCamera.size;
          const angle = Math.atan2(im, re);
          const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;
          const mag = Math.hypot(re, im);
          const logMag = mag > 0 ? Math.log2(mag) : 0;
          const lightness = 35 + (logMag % 1) * 15;
          const [r, g, b] = hslToRgb(hue, 60, lightness);
          const idx = (py * 120 + px) * 4;
          data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 90;
        }
      }
      icCtx.putImageData(imgData, 0, 0);
      iCtx.drawImage(iColoringCanvas, 0, 0, cssIWidth, cssIHeight);
    }

    // 2. Draw High Contrast Origin Crosshair
    const originW = mathToImagePixel(0, 0);
    iCtx.strokeStyle = "rgba(239, 68, 68, 0.4)"; // red-500
    iCtx.lineWidth = 1.5;
    iCtx.beginPath();
    iCtx.moveTo(0, originW.y); iCtx.lineTo(cssIWidth, originW.y);
    iCtx.moveTo(originW.x, 0); iCtx.lineTo(originW.x, cssIHeight);
    iCtx.stroke();
    // Center point marker
    iCtx.fillStyle = "#ef4444";
    iCtx.beginPath();
    iCtx.arc(originW.x, originW.y, 4, 0, 2 * Math.PI);
    iCtx.fill();

    // 3. Draw Projected Curves
    if (curves.length > 0) {
      curves.forEach((curve, idx) => {
        iCtx.strokeStyle = colors[idx];
        iCtx.lineWidth = isAnimating ? 1 : 2;
        
        // Fading discarded curves
        if (verdictReached && idx !== winningIndex) {
          iCtx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          iCtx.lineWidth = 1;
        }

        iCtx.beginPath();
        for (let i = 0; i <= animationFrame; i++) {
          if (i >= curve.pPoints.length) break;
          const p = curve.pPoints[i];
          const pix = mathToImagePixel(p.re, p.im);
          if (i === 0) iCtx.moveTo(pix.x, pix.y);
          else iCtx.lineTo(pix.x, pix.y);
        }
        iCtx.stroke();

        // 4. Draw Radar Ray and Tracker Dot
        if (isAnimating && animationFrame > 0 && animationFrame < 800) {
          const p = curve.pPoints[animationFrame];
          const pPix = mathToImagePixel(p.re, p.im);

          // Radar Line: Thin straight line from origin
          iCtx.strokeStyle = colors[idx] + "aa";
          iCtx.lineWidth = 1;
          iCtx.beginPath();
          iCtx.moveTo(originW.x, originW.y);
          iCtx.lineTo(pPix.x, pPix.y);
          iCtx.stroke();

          // Seeker Dot: Pulsing circle
          iCtx.fillStyle = colors[idx];
          iCtx.beginPath();
          iCtx.arc(pPix.x, pPix.y, 5, 0, 2 * Math.PI);
          iCtx.fill();
        }

        // 5. Draw Winding Number Labels after verdict
        if (verdictReached) {
          const finalPt = curve.pPoints[Math.floor(curve.pPoints.length / 2)];
          const labelPix = mathToImagePixel(finalPt.re, finalPt.im);
          const wn = windingNumbers[idx];

          iCtx.fillStyle = wn >= 1 ? "#10b981" : "#52525b"; // Emerald vs Zinc
          iCtx.font = "bold 11px monospace";
          iCtx.shadowColor = "rgba(0,0,0,0.8)";
          iCtx.shadowBlur = 4;
          iCtx.fillText(`Δ = ${wn}`, labelPix.x + 6, labelPix.y - 6);
          iCtx.shadowBlur = 0; // reset
        }
      });
    }
    iCtx.restore();

  }, [domainCamera, imageCamera, activeSquare, subSquares, curves, animationFrame, isAnimating, verdictReached, winningIndex, windingNumbers, coeffs]);

  // Restart/Reset state
  const handleReset = () => {
    setIsAnimating(false);
    setVerdictReached(false);
    setWinningIndex(null);
    setAnimationFrame(0);
    setCurves([]);
    setWindingNumbers([]);
    setSubSquares(null);
    setActiveSquare({ x: -2, y: -2, size: 4, depth: 0 });
    setDomainCamera({ x: -2, y: -2, size: 4 });
  };

  return (
    <div className="w-full flex flex-col gap-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-2xl select-none">
      
      {/* Header and statistics controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-zinc-100 tracking-tight font-sans">
            {t.title}
          </h3>
          <p className="text-xs text-zinc-400 font-serif leading-relaxed max-w-xl">
            {t.intro}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right font-mono text-[10px] text-zinc-400 gap-0.5">
            <span>{t.depth}: <strong className="text-emerald-400 font-bold">{activeSquare.depth}</strong></span>
            <span>{t.size}: <strong className="text-blue-400 font-bold">{activeSquare.size.toFixed(4)}</strong></span>
          </div>

          <button
            onClick={handleNextStep}
            disabled={isAnimating}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-xl shadow-lg transition-all transform active:scale-95"
          >
            {t.step}
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-extrabold text-xs rounded-xl transition-all"
          >
            {t.reset}
          </button>
        </div>
      </div>

      {/* Dual Screen Display Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Domain Panel (Left) */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              {t.domainTitle}
            </span>
            <span className="text-[10px] font-mono text-zinc-500 font-semibold italic">
              {t.activeLabel}: x:[{activeSquare.x.toFixed(2)}, {(activeSquare.x + activeSquare.size).toFixed(2)}]
            </span>
          </div>

          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/40">
            <canvas
              ref={webglCanvasRef}
              width={500}
              height={500}
              className="absolute inset-0 w-full h-full block"
            />
            <canvas
              ref={domainCanvasRef}
              width={500}
              height={500}
              className="absolute inset-0 w-full h-full pointer-events-none block"
            />
          </div>
        </div>

        {/* Image Panel (Right) */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              {t.imageTitle}
            </span>
            <span className="text-[10px] font-mono text-red-400 font-semibold">
              Crosshair: Origin (0,0)
            </span>
          </div>

          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/40">
            <canvas
              ref={imageCanvasRef}
              width={500}
              height={500}
              className="w-full h-full block"
            />

            {/* Live scanning/verdict absolute bottom alert */}
            {isAnimating && (
              <div className="absolute bottom-3 left-3 right-3 py-2 px-3 bg-zinc-950/90 border border-emerald-500/30 rounded-lg backdrop-blur text-[10px] font-mono text-emerald-400 tracking-wide text-center animate-pulse">
                ⚡ {t.scanning} [{animationFrame}/800]
              </div>
            )}
            {verdictReached && (
              <div className="absolute bottom-3 left-3 right-3 py-2 px-3 bg-zinc-950/90 border border-blue-500/30 rounded-lg backdrop-blur text-[10px] font-mono text-blue-400 tracking-wide text-center">
                🏆 {t.verdict}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}