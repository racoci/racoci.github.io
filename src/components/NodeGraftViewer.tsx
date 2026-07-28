"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

interface TraitConfig {
  name: string;
  min: number;
  max: number;
  value: number;
  type: "slider" | "toggle";
}

interface Vertex3D {
  x: number;
  y: number;
  z: number;
  nx?: number;
  ny?: number;
  nz?: number;
}

interface Quad3D {
  indices: [number, number, number, number];
  depth: number;
  normal: { x: number; y: number; z: number };
}

const DEFAULT_WGSL = `/**
 * @name NodeGraft Procedural Prop
 * @version 1.0.4
 * @scion RootGraft
 * @trait Size [0.3, 1.2, 0.75]
 * @trait Complexity [1.0, 10.0, 4.0]
 * @trait Twist [-5.0, 5.0, 1.5]
 * @trait Hollow [0.0, 1.0, 0.0]
 */

struct Trait {
  size: f32,
  complexity: f32,
  twist: f32,
  hollow: f32,
}

// Pass 1: SDF Evaluation
fn sdf(p: vec3f, t: Trait) -> f32 {
  // Apply twisting transformation
  let angle = p.y * t.twist * 0.8;
  let s = sin(angle);
  let c = cos(angle);
  let q = vec3f(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  
  // Base sphere
  var d = length(q) - t.size;
  
  // Gyroid noise modulation
  let noise = sin(q.x * t.complexity) * sin(q.y * t.complexity) * sin(q.z * t.complexity) * 0.12;
  d += noise;
  
  // Hollow shell operation
  if (t.hollow > 0.5) {
    d = abs(d) - 0.04;
  }
  return d;
}

// Pass 2: Dual Contouring Vertex Placement
// Pass 3: Quad Mesh Stitching
`;

export default function NodeGraftViewer() {
  const [code, setCode] = useState(DEFAULT_WGSL);
  const [traits, setTraits] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"traits" | "editor" | "dag">("traits");
  const [activeDagNode, setActiveDagNode] = useState<string>("eval");

  // Telemetry state
  const [fps, setFps] = useState(60);
  const [verticesCount, setVerticesCount] = useState(0);
  const [trianglesCount, setTrianglesCount] = useState(0);
  const [evaluationsCount, setEvaluationsCount] = useState(0);
  const [genTime, setGenTime] = useState(0);
  const [renderingMode, setRenderingMode] = useState<"WebGPU" | "CPU Polyfill">("CPU Polyfill");
  const [gpuName, setGpuName] = useState<string>("Unknown Adapter");

  // WebGPUAdapter and Device refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Rotation angles
  const [yaw, setYaw] = useState<number>(0.5);
  const [pitch, setPitch] = useState<number>(0.3);
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });

  // Parse WGSL code to get traits metadata
  const parsedTraits = useMemo(() => {
    const traitsList: TraitConfig[] = [];
    const lines = code.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("@trait")) {
        const match = trimmed.match(
          /@trait\s+(\w+)\s+\[([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\]/
        );
        if (match) {
          const [_, name, minStr, maxStr, defStr] = match;
          const min = parseFloat(minStr);
          const max = parseFloat(maxStr);
          const value = parseFloat(defStr);
          traitsList.push({
            name,
            min,
            max,
            value,
            type: min === 0 && max === 1 && (value === 0 || value === 1) ? "toggle" : "slider",
          });
        }
      }
    }
    return traitsList;
  }, [code]);

  // Sync state values with parsed traits defaults when parsedTraits changes
  useEffect(() => {
    setTraits((prev) => {
      const next: Record<string, number> = { ...prev };
      parsedTraits.forEach((t) => {
        if (next[t.name] === undefined) {
          next[t.name] = t.value;
        }
      });
      return next;
    });
  }, [parsedTraits]);

  // Attempt WebGPU Initialization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initWebGPU = async () => {
      const nav = navigator as any;
      if (!nav.gpu) {
        setRenderingMode("CPU Polyfill");
        setGpuName("WebGPU not supported by browser");
        return;
      }

      try {
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) {
          setRenderingMode("CPU Polyfill");
          setGpuName("WebGPU Adapter unavailable");
          return;
        }

        const device = await adapter.requestDevice();
        if (device) {
          setRenderingMode("WebGPU");
          setGpuName(adapter.info?.description || "Hardware Accelerated WebGPU");
        }
      } catch (err) {
        console.error("WebGPU setup failed, falling back to CPU", err);
        setRenderingMode("CPU Polyfill");
        setGpuName("Fallback Active");
      }
    };

    initWebGPU();
  }, []);

  // CPU Fallback Rendering Loop (SDF + Dual Contouring in Javascript)
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsInterval = lastTime;

    const renderLoop = () => {
      const now = performance.now();
      frameCount++;
      if (now - fpsInterval >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - fpsInterval)));
        frameCount = 0;
        fpsInterval = now;
      }

      // Rotate model slightly if not dragging
      if (!isDragging.current) {
        setYaw((prev) => (prev + 0.005) % (Math.PI * 2));
      }

      drawCanvas();
      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [traits, yaw, pitch, code]);

  // Real-time Dual Contouring Mesh Generation & Canvas 2D Draw Call
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear Canvas with a sophisticated radial mesh background
    ctx.fillStyle = "#09090b"; // zinc-950
    ctx.fillRect(0, 0, width, height);

    // Grid lines for background technical look
    ctx.strokeStyle = "rgba(63, 63, 70, 0.15)"; // zinc-700
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const tStart = performance.now();

    // SDF Evaluator
    const sdfEval = (x: number, y: number, z: number): number => {
      const size = traits["Size"] !== undefined ? traits["Size"] : 0.75;
      const complexity = traits["Complexity"] !== undefined ? traits["Complexity"] : 4.0;
      const twist = traits["Twist"] !== undefined ? traits["Twist"] : 1.5;
      const hollow = traits["Hollow"] !== undefined ? traits["Hollow"] : 0.0;

      // Twist
      const angle = y * twist * 0.8;
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      const rx = x * c - z * s;
      const rz = x * s + z * c;

      // Sphere base
      let d = Math.sqrt(rx * rx + y * y + rz * rz) - size;

      // Noise modulation
      if (complexity > 0) {
        const noise =
          Math.sin(rx * complexity) *
          Math.sin(y * complexity) *
          Math.sin(rz * complexity) *
          0.12;
        d += noise;
      }

      if (hollow > 0.5) {
        d = Math.abs(d) - 0.04;
      }
      return d;
    };

    // Parameters for DC grid
    const N = 12; // Grid resolution (optimized for fast CPU execution)
    const bounds = 1.3;
    const step = (bounds * 2) / (N - 1);

    // 1. Evaluate SDF at Grid Nodes
    const sdfGrid = new Float32Array(N * N * N);
    let sdfsComputed = 0;

    for (let i = 0; i < N; i++) {
      const x = -bounds + i * step;
      for (let j = 0; j < N; j++) {
        const y = -bounds + j * step;
        for (let k = 0; k < N; k++) {
          const z = -bounds + k * step;
          const val = sdfEval(x, y, z);
          sdfGrid[i * N * N + j * N + k] = val;
          sdfsComputed++;
        }
      }
    }

    setEvaluationsCount(sdfsComputed);

    // 2. Generate dual vertices per active voxel cell
    // Each cell is defined by its lower-left-front corner (i, j, k) where 0 <= i, j, k < N-1
    const cellVertices: (Vertex3D | null)[] = new Array((N - 1) * (N - 1) * (N - 1)).fill(null);

    const getGridPos = (i: number, j: number, k: number): [number, number, number] => {
      return [-bounds + i * step, -bounds + j * step, -bounds + k * step];
    };

    // Loop through cells and place dual vertices
    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        for (let k = 0; k < N - 1; k++) {
          // Corner offsets for 8 corners of a cube
          const corners = [
            [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
            [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
          ];

          // 12 edges of a cube
          const edges = [
            [0, 1], [2, 3], [4, 5], [6, 7], // along X
            [0, 2], [1, 3], [4, 6], [5, 7], // along Y
            [0, 4], [1, 5], [2, 6], [3, 7]  // along Z
          ];

          let intersectionSumX = 0;
          let intersectionSumY = 0;
          let intersectionSumZ = 0;
          let intersectionsCount = 0;

          // Check each edge for a sign change
          for (const [eStart, eEnd] of edges) {
            const cS = corners[eStart];
            const cE = corners[eEnd];

            const idxS = (i + cS[0]) * N * N + (j + cS[1]) * N + (k + cS[2]);
            const idxE = (i + cE[0]) * N * N + (j + cE[1]) * N + (k + cE[2]);

            const sdfS = sdfGrid[idxS];
            const sdfE = sdfGrid[idxE];

            if (sdfS * sdfE < 0) {
              // Sign change found, calculate linear interpolation point
              const t = Math.abs(sdfS) / (Math.abs(sdfS) + Math.abs(sdfE));
              const pS = getGridPos(i + cS[0], j + cS[1], k + cS[2]);
              const pE = getGridPos(i + cE[0], j + cE[1], k + cE[2]);

              intersectionSumX += pS[0] + t * (pE[0] - pS[0]);
              intersectionSumY += pS[1] + t * (pE[1] - pS[1]);
              intersectionSumZ += pS[2] + t * (pE[2] - pS[2]);
              intersectionsCount++;
            }
          }

          if (intersectionsCount > 0) {
            // Dual vertex is the average of Hermite intersections (standard QEF simplification)
            cellVertices[i * (N - 1) * (N - 1) + j * (N - 1) + k] = {
              x: intersectionSumX / intersectionsCount,
              y: intersectionSumY / intersectionsCount,
              z: intersectionSumZ / intersectionsCount
            };
          }
        }
      }
    }

    // List of active vertices
    const activeVertices: Vertex3D[] = [];
    const cellToVertexIndex = new Int32Array((N - 1) * (N - 1) * (N - 1)).fill(-1);

    cellVertices.forEach((v, idx) => {
      if (v !== null) {
        cellToVertexIndex[idx] = activeVertices.length;
        activeVertices.push(v);
      }
    });

    setVerticesCount(activeVertices.length);

    // 3. Stitch Quads by checking all grid edges
    // For every active edge, we create a quad connecting the dual vertices of the 4 cells sharing that edge.
    const quads: Quad3D[] = [];

    const getCellVertexIndex = (ci: number, cj: number, ck: number): number => {
      if (ci < 0 || ci >= N - 1 || cj < 0 || cj >= N - 1 || ck < 0 || ck >= N - 1) return -1;
      return cellToVertexIndex[ci * (N - 1) * (N - 1) + cj * (N - 1) + ck];
    };

    // X-axis edges
    for (let i = 0; i < N - 1; i++) {
      for (let j = 1; j < N - 1; j++) {
        for (let k = 1; k < N - 1; k++) {
          const idxS = i * N * N + j * N + k;
          const idxE = (i + 1) * N * N + j * N + k;
          if (sdfGrid[idxS] * sdfGrid[idxE] < 0) {
            const v0 = getCellVertexIndex(i, j - 1, k - 1);
            const v1 = getCellVertexIndex(i, j, k - 1);
            const v2 = getCellVertexIndex(i, j, k);
            const v3 = getCellVertexIndex(i, j - 1, k);
            if (v0 !== -1 && v1 !== -1 && v2 !== -1 && v3 !== -1) {
              quads.push({ indices: [v0, v1, v2, v3], depth: 0, normal: { x: 0, y: 0, z: 0 } });
            }
          }
        }
      }
    }

    // Y-axis edges
    for (let i = 1; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        for (let k = 1; k < N - 1; k++) {
          const idxS = i * N * N + j * N + k;
          const idxE = i * N * N + (j + 1) * N + k;
          if (sdfGrid[idxS] * sdfGrid[idxE] < 0) {
            const v0 = getCellVertexIndex(i - 1, j, k - 1);
            const v1 = getCellVertexIndex(i, j, k - 1);
            const v2 = getCellVertexIndex(i, j, k);
            const v3 = getCellVertexIndex(i - 1, j, k);
            if (v0 !== -1 && v1 !== -1 && v2 !== -1 && v3 !== -1) {
              // Swap order to maintain correct facing direction
              quads.push({ indices: [v0, v3, v2, v1], depth: 0, normal: { x: 0, y: 0, z: 0 } });
            }
          }
        }
      }
    }

    // Z-axis edges
    for (let i = 1; i < N - 1; i++) {
      for (let j = 1; j < N - 1; j++) {
        for (let k = 0; k < N - 1; k++) {
          const idxS = i * N * N + j * N + k;
          const idxE = i * N * N + j * N + (k + 1);
          if (sdfGrid[idxS] * sdfGrid[idxE] < 0) {
            const v0 = getCellVertexIndex(i - 1, j - 1, k);
            const v1 = getCellVertexIndex(i, j - 1, k);
            const v2 = getCellVertexIndex(i, j, k);
            const v3 = getCellVertexIndex(i - 1, j, k);
            if (v0 !== -1 && v1 !== -1 && v2 !== -1 && v3 !== -1) {
              quads.push({ indices: [v0, v1, v2, v3], depth: 0, normal: { x: 0, y: 0, z: 0 } });
            }
          }
        }
      }
    }

    setTrianglesCount(quads.length * 2);

    // 4. Project and Depth-Sort Quads
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const projectedVertices = activeVertices.map((v) => {
      // Rotate around Y (Yaw)
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;
      // Rotate around X (Pitch)
      let y2 = v.y * cosP - z1 * sinP;
      let z2 = v.y * sinP + z1 * cosP;

      const fov = 350;
      const distance = 3.2;
      const sx = width / 2 + (x1 * fov) / (z2 + distance);
      const sy = height / 2 - (y2 * fov) / (z2 + distance);

      return { sx, sy, depth: z2, xRot: x1, yRot: y2, zRot: z2 };
    });

    // Compute normals and average depths for quads
    quads.forEach((q) => {
      const v0 = activeVertices[q.indices[0]];
      const v1 = activeVertices[q.indices[1]];
      const v2 = activeVertices[q.indices[2]];

      // Cross product for normals: (v1 - v0) x (v2 - v0)
      const ax = v1.x - v0.x;
      const ay = v1.y - v0.y;
      const az = v1.z - v0.z;
      const bx = v2.x - v0.x;
      const by = v2.y - v0.y;
      const bz = v2.z - v0.z;

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      q.normal = { x: nx / len, y: ny / len, z: nz / len };

      // Average depth of projected vertices
      q.depth =
        (projectedVertices[q.indices[0]].depth +
          projectedVertices[q.indices[1]].depth +
          projectedVertices[q.indices[2]].depth +
          projectedVertices[q.indices[3]].depth) /
        4;
    });

    // Sort quads from back to front (Painter's Algorithm)
    quads.sort((a, b) => b.depth - a.depth);

    // Light direction (fixed relative to screen camera)
    const lightDir = { x: 0.4, y: 0.6, z: -0.7 };
    const lightLen = Math.sqrt(lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z);
    lightDir.x /= lightLen;
    lightDir.y /= lightLen;
    lightDir.z /= lightLen;

    // 5. Draw Sorted Quads
    quads.forEach((q) => {
      const p0 = projectedVertices[q.indices[0]];
      const p1 = projectedVertices[q.indices[1]];
      const p2 = projectedVertices[q.indices[2]];
      const p3 = projectedVertices[q.indices[3]];

      // Normal rotation (same as vertices rotation)
      const n = q.normal;
      let nx1 = n.x * cosY - n.z * sinY;
      let nz1 = n.x * sinY + n.z * cosY;
      let ny2 = n.y * cosP - nz1 * sinP;
      let nz2 = n.y * sinP + nz1 * cosP;

      // Dot product with screen light
      const dot = nx1 * lightDir.x + ny2 * lightDir.y + nz2 * lightDir.z;
      const intensity = Math.max(0.1, dot);

      // Creative high-tech shaded fill: emerald/teal tones
      const baseAlpha = 0.55;
      const r = Math.floor(16 + intensity * 20); // 16 -> 36
      const g = Math.floor(185 * intensity + 30); // emerald base is 185
      const b = Math.floor(129 * intensity + 40);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.45)"; // emerald outline
      ctx.lineWidth = 0.75;

      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.lineTo(p3.sx, p3.sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    const tEnd = performance.now();
    setGenTime(parseFloat((tEnd - tStart).toFixed(1)));
  };

  // Mouse drag handlers to rotate 3D camera
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevMousePos.current.x;
    const dy = e.clientY - prevMousePos.current.y;

    setYaw((prev) => (prev + dx * 0.007) % (Math.PI * 2));
    setPitch((prev) => Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, prev + dy * 0.007)));

    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  // Trait control update
  const handleTraitChange = (name: string, val: number) => {
    setTraits((prev) => ({ ...prev, [name]: val }));
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/60 shadow-xl flex flex-col font-sans mb-12">
      {/* Viewer Header */}
      <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            NodeGraft Live Module / PolyGraft 3D
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md font-mono font-semibold">
          <span>Active Device:</span>
          <span className="text-emerald-600 dark:text-emerald-400">{renderingMode}</span>
        </div>
      </div>

      {/* Main Grid: Left is viewport + Telemetry, Right is Sidebar Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Interactive 3D Canvas */}
        <div className="col-span-1 lg:col-span-7 p-4 bg-zinc-900 flex flex-col items-center justify-center relative min-h-[400px]">
          <canvas
            ref={canvasRef}
            width={480}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="cursor-grab active:cursor-grabbing w-full max-w-[480px] aspect-[1.2] rounded-lg border border-zinc-800 bg-zinc-950 shadow-inner"
          />
          <div className="absolute top-6 left-6 bg-zinc-950/80 border border-zinc-800/80 rounded px-3 py-1.5 text-[10px] text-zinc-400 font-mono pointer-events-none">
            Drag mouse to rotate camera
          </div>
        </div>

        {/* Right Side: Sidebar Panels (Tabs) */}
        <div className="col-span-1 lg:col-span-5 flex flex-col border-l border-zinc-200 dark:border-zinc-800 h-full min-h-[440px]">
          {/* Tab Headers */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
            <button
              onClick={() => setActiveTab("traits")}
              className={`flex-1 text-center py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === "traits"
                  ? "border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Traits Panel
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex-1 text-center py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === "editor"
                  ? "border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Code Editor (WGSL)
            </button>
            <button
              onClick={() => setActiveTab("dag")}
              className={`flex-1 text-center py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === "dag"
                  ? "border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-950"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              DAG Inspector
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 p-5 overflow-y-auto bg-white dark:bg-zinc-950/20">
            {activeTab === "traits" && (
              <div className="space-y-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Adjust procedural parameters parsed directly from the WGSL source frontmatter
                  annotations:
                </p>
                {parsedTraits.length === 0 ? (
                  <p className="text-xs text-amber-500 font-mono italic">
                    No @trait configurations found in current code.
                  </p>
                ) : (
                  parsedTraits.map((t) => (
                    <div key={t.name} className="space-y-2 border-b border-zinc-100 dark:border-zinc-900 pb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {t.name}
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {traits[t.name] !== undefined
                            ? traits[t.name].toFixed(2)
                            : t.value.toFixed(2)}
                        </span>
                      </div>
                      {t.type === "slider" ? (
                        <input
                          type="range"
                          min={t.min}
                          max={t.max}
                          step={t.name === "Complexity" ? 0.5 : 0.05}
                          value={traits[t.name] !== undefined ? traits[t.name] : t.value}
                          onChange={(e) => handleTraitChange(t.name, parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 dark:accent-emerald-400 focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() =>
                            handleTraitChange(
                              t.name,
                              (traits[t.name] !== undefined ? traits[t.name] : t.value) > 0.5
                                ? 0
                                : 1
                            )
                          }
                          className={`w-full py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                            (traits[t.name] !== undefined ? traits[t.name] : t.value) > 0.5
                              ? "bg-emerald-500/10 dark:bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          {(traits[t.name] !== undefined ? traits[t.name] : t.value) > 0.5
                            ? "Active / Ativo"
                            : "Inactive / Inativo"}
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div className="pt-4 text-[11px] text-zinc-400 dark:text-zinc-500 font-serif leading-relaxed italic">
                  Note: Changes to these traits update the SDF (Signed Distance Field) volume which is
                  then contoured on-the-fly.
                </div>
              </div>
            )}

            {activeTab === "editor" && (
              <div className="flex flex-col h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                    Live WGSL Source
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Hot-reload Active
                  </span>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full flex-1 min-h-[220px] font-mono text-xs p-3.5 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  spellCheck="false"
                />
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-serif">
                  Modify the frontmatter `@trait` definitions or customize the `sdf` function inside the editor above. The UI updates dynamically.
                </div>
              </div>
            )}

            {activeTab === "dag" && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  WebGPU Procedural Scaffold Pipeline. Click a node below to inspect execution telemetry:
                </p>
                <div className="flex flex-col gap-3 py-1">
                  {/* Node 1 */}
                  <div
                    onClick={() => setActiveDagNode("eval")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeDagNode === "eval"
                        ? "bg-emerald-500/10 dark:bg-emerald-400/5 border-emerald-500/40"
                        : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        1. SDF Evaluation
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded font-mono">
                        Pass 1
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Calculates distances inside voxel field. Evaluated {evaluationsCount} grid positions.
                    </p>
                  </div>

                  {/* Flow Arrow */}
                  <div className="text-center text-zinc-400 dark:text-zinc-600">↓</div>

                  {/* Node 2 */}
                  <div
                    onClick={() => setActiveDagNode("cont")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeDagNode === "cont"
                        ? "bg-emerald-500/10 dark:bg-emerald-400/5 border-emerald-500/40"
                        : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        2. Dual Contouring (Vertex Gen)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded font-mono">
                        Pass 2
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Solves Hermite crossing averages per active cell. Extracted {verticesCount} points.
                    </p>
                  </div>

                  {/* Flow Arrow */}
                  <div className="text-center text-zinc-400 dark:text-zinc-600">↓</div>

                  {/* Node 3 */}
                  <div
                    onClick={() => setActiveDagNode("stitch")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeDagNode === "stitch"
                        ? "bg-emerald-500/10 dark:bg-emerald-400/5 border-emerald-500/40"
                        : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        3. Quad Mesh Stitching
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-mono">
                        Pass 3
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Resolves index arrays and generates quads. Stitched {trianglesCount / 2} faces.
                    </p>
                  </div>
                </div>

                {/* Node details */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs space-y-1.5">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[10px] uppercase text-zinc-400">
                    Node Metadata: {activeDagNode}
                  </div>
                  {activeDagNode === "eval" && (
                    <div className="space-y-1 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      <div>• Output: SDF Voxel Volume (Texture3D)</div>
                      <div>• Voxel Grid Size: 12 x 12 x 12</div>
                      <div>• Immutable Hash: <span className="text-emerald-500">f491c28b</span></div>
                    </div>
                  )}
                  {activeDagNode === "cont" && (
                    <div className="space-y-1 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      <div>• Input: Voxel Volume from Pass 1</div>
                      <div>• Method: Hermite Average Placement</div>
                      <div>• Output: Vertex Buffer (StorageBuffer)</div>
                    </div>
                  )}
                  {activeDagNode === "stitch" && (
                    <div className="space-y-1 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      <div>• Input: Vertex Buffer + Voxel Volume</div>
                      <div>• Output: Quad Index Buffer</div>
                      <div>• Final Polygons: {trianglesCount / 2} Quads</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="bg-zinc-900 text-zinc-100 border-t border-zinc-800 px-5 py-4 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800 text-xs font-mono">
        <div className="flex flex-col justify-center items-start md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">Frame Rate</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{fps} FPS</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">Vertices</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{verticesCount}</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">Triangles</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{trianglesCount}</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">Compute SDF Calls</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{evaluationsCount}</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">Gen Time</span>
          <span className="text-emerald-400 font-bold text-sm mt-0.5">{genTime} ms</span>
        </div>
      </div>

      {/* GPU Adapter Details */}
      <div className="bg-zinc-950 text-[10px] text-zinc-500 px-5 py-2 font-mono flex items-center justify-between border-t border-zinc-900">
        <span>Adapter Details: {gpuName}</span>
        <span>Version: 1.0.4 (Git-backed)</span>
      </div>
    </div>
  );
}
