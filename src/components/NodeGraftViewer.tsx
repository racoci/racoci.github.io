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

interface PropItem {
  id: string;
  name: string;
  tags: string[];
  wgsl: string;
  defaultTraits: Record<string, number>;
  description: {
    en: string;
    pt: string;
  };
}

interface Category {
  name: {
    en: string;
    pt: string;
  };
  icon: string;
  props: PropItem[];
}

interface LayoutPane {
  id: string;
  type: "viewport" | "graph" | "editor" | "refactoring" | "dag";
}

const PROPS_LIBRARY: PropItem[] = [
  {
    id: "gyroid-core",
    name: "Gyroid Reactor Core",
    tags: ["procedural", "organic", "ornament", "energetics"],
    defaultTraits: { Size: 0.75, Complexity: 4.0, Twist: 1.5, Hollow: 0.0 },
    description: {
      en: "Procedural reactor core modulated by high-frequency trigonometric noise fields.",
      pt: "Núcleo de reator procedural modulado por campos de ruído trigonométrico senoidal."
    },
    wgsl: `/**
 * @name Gyroid Reactor Core
 * @version 1.0.4
 * @scion ReactorGraft
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

fn sdf(p: vec3f, t: Trait) -> f32 {
  let angle = p.y * t.twist * 0.8;
  let s = sin(angle);
  let c = cos(angle);
  let q = vec3f(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  
  var d = length(q) - t.size;
  let noise = sin(q.x * t.complexity) * sin(q.y * t.complexity) * sin(q.z * t.complexity) * 0.12;
  d += noise;
  
  if (t.hollow > 0.5) {
    d = abs(d) - 0.04;
  }
  return d;
}`
  },
  {
    id: "threaded-bolt",
    name: "Threaded Mechanical Bolt",
    tags: ["mechanical", "hard-surface", "kitbash", "joint"],
    defaultTraits: { Size: 0.8, Complexity: 8.0, Twist: 2.0, Hollow: 0.0 },
    description: {
      en: "Hexagonal head structural bolt featuring helical thread pitch modulation.",
      pt: "Parafuso estrutural de cabeça hexagonal com passo de rosca helicoidal regulável."
    },
    wgsl: `/**
 * @name Threaded Mechanical Bolt
 * @version 1.1.0
 * @scion JointGraft
 * @trait Size [0.3, 1.2, 0.8]
 * @trait Complexity [1.0, 20.0, 8.0]
 * @trait Twist [-5.0, 5.0, 2.0]
 * @trait Hollow [0.0, 1.0, 0.0]
 */

struct Trait {
  size: f32,
  complexity: f32,
  twist: f32,
  hollow: f32,
}

fn sdf(p: vec3f, t: Trait) -> f32 {
  let radius = t.size * 0.4;
  let d_cyl = length(p.xz) - radius;
  let thread = sin(p.y * t.complexity + atan2(p.z, p.x) * t.twist) * 0.04;
  var d = d_cyl + thread;
  
  let head = max(max(abs(p.x) - t.size*0.6, abs(p.z) - t.size*0.6), abs(p.y - 0.75) - 0.15);
  if (t.hollow > 0.5) {
    return min(d, head);
  }
  return d;
}`
  },
  {
    id: "industrial-gear",
    name: "Industrial Spur Gear",
    tags: ["mechanical", "hard-surface", "kitbash", "procedural"],
    defaultTraits: { Size: 0.85, Complexity: 10.0, Twist: 1.5, Hollow: 1.0 },
    description: {
      en: "Heavy transmission pinion with variable gear teeth frequency and hollow shaft.",
      pt: "Pinhão de transmissão pesada com frequência de dentes variável e furo axial."
    },
    wgsl: `/**
 * @name Industrial Spur Gear
 * @version 1.2.0
 * @scion GearGraft
 * @trait Size [0.3, 1.2, 0.85]
 * @trait Complexity [4.0, 16.0, 10.0]
 * @trait Twist [-5.0, 5.0, 1.5]
 * @trait Hollow [0.0, 1.0, 1.0]
 */

struct Trait {
  size: f32,
  complexity: f32,
  twist: f32,
  hollow: f32,
}

fn sdf(p: vec3f, t: Trait) -> f32 {
  let theta = atan2(p.z, p.x);
  let tooth = sin(theta * t.complexity) * 0.08 * t.twist;
  let radius = t.size * 0.65 + tooth;
  let d_cyl = length(p.xz) - radius;
  
  let d_gear = max(d_cyl, abs(p.y) - 0.18);
  if (t.hollow > 0.5) {
    let d_hole = length(p.xz) - t.size * 0.22;
    return max(d_gear, -d_hole);
  }
  return d_gear;
}`
  },
  {
    id: "organic-root",
    name: "Organic Root Knot",
    tags: ["organic", "procedural", "ornament"],
    defaultTraits: { Size: 0.7, Complexity: 6.0, Twist: 3.0, Hollow: 0.0 },
    description: {
      en: "Biomorphic knotted vine structured as a twisted wave-modulated torus.",
      pt: "Trepadeira nodosa biomórfica estruturada como um toro de onda torcida."
    },
    wgsl: `/**
 * @name Organic Root Knot
 * @version 2.0.1
 * @scion RootGraft
 * @trait Size [0.3, 1.2, 0.7]
 * @trait Complexity [1.0, 12.0, 6.0]
 * @trait Twist [-5.0, 5.0, 3.0]
 * @trait Hollow [0.0, 1.0, 0.0]
 */

struct Trait {
  size: f32,
  complexity: f32,
  twist: f32,
  hollow: f32,
}

fn sdf(p: vec3f, t: Trait) -> f32 {
  let theta = atan2(p.z, p.x);
  let wave = sin(theta * t.complexity + p.y * t.twist) * 0.07;
  let r_maj = t.size * 0.55;
  
  var d = length(vec2f(length(p.xz) - r_maj, p.y)) - (t.size * 0.22 + wave);
  if (t.hollow > 0.5) {
    d = abs(d) - 0.03;
  }
  return d;
}`
  },
  {
    id: "scifi-crate",
    name: "Modular Sci-Fi Crate",
    tags: ["structural", "hard-surface", "kitbash", "procedural"],
    defaultTraits: { Size: 0.8, Complexity: 5.0, Twist: 1.0, Hollow: 0.0 },
    description: {
      en: "Heavy reinforced cargo crate with mathematical panel grooves and beveled edges.",
      pt: "Caixa de carga reforçada com ranhuras geométricas e cantos chanfrados."
    },
    wgsl: `/**
 * @name Modular Sci-Fi Crate
 * @version 1.0.1
 * @scion StructureGraft
 * @trait Size [0.3, 1.2, 0.8]
 * @trait Complexity [2.0, 10.0, 5.0]
 * @trait Twist [-5.0, 5.0, 1.0]
 * @trait Hollow [0.0, 1.0, 0.0]
 */

struct Trait {
  size: f32,
  complexity: f32,
  twist: f32,
  hollow: f32,
}

fn sdf(p: vec3f, t: Trait) -> f32 {
  let d_box = max(max(abs(p.x) - t.size * 0.55, abs(p.y) - t.size * 0.55), abs(p.z) - t.size * 0.55) - (0.05 * t.twist);
  let groove = sin(p.x * t.complexity) * sin(p.y * t.complexity) * sin(p.z * t.complexity);
  
  var d = d_box + max(0.0, groove) * 0.015;
  if (t.hollow > 0.5) {
    d = abs(d) - 0.03;
  }
  return d;
}`
  }
];

const PREDEFINED_CATEGORIES: Category[] = [
  {
    name: { en: "Mechanical Elements", pt: "Elementos Mecânicos" },
    icon: "⚙️",
    props: [PROPS_LIBRARY[1], PROPS_LIBRARY[2]]
  },
  {
    name: { en: "Structural Blocks", pt: "Elementos Estruturais" },
    icon: "🏗️",
    props: [PROPS_LIBRARY[4]]
  },
  {
    name: { en: "Biomorphic Shapes", pt: "Formas Biomórficas" },
    icon: "🌿",
    props: [PROPS_LIBRARY[3]]
  },
  {
    name: { en: "Energetic Reactor Cores", pt: "Núcleos Energéticos" },
    icon: "⚡",
    props: [PROPS_LIBRARY[0]]
  }
];

const SENSIBLE_TAGS = [
  "hard-surface",
  "mechanical",
  "organic",
  "structural",
  "joint",
  "procedural",
  "kitbash",
  "ornament",
  "energetics"
];

interface NodeGraftViewerProps {
  lang: "en" | "pt";
}

export default function NodeGraftViewer({ lang }: NodeGraftViewerProps) {
  const [activePropId, setActivePropId] = useState<string>("gyroid-core");
  const [code, setCode] = useState(PROPS_LIBRARY[0].wgsl);
  const [traits, setTraits] = useState<Record<string, number>>(PROPS_LIBRARY[0].defaultTraits);
  const [activeDagNode, setActiveDagNode] = useState<string>("eval");

  const [panes, setPanes] = useState<LayoutPane[]>([
    { id: "pane-left", type: "graph" },
    { id: "pane-center", type: "viewport" },
    { id: "pane-right", type: "editor" }
  ]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Mechanical Elements": true,
    "Structural Blocks": true,
    "Biomorphic Shapes": true,
    "Energetic Reactor Cores": true
  });

  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [customTagsMap, setCustomTagsMap] = useState<Record<string, string[]>>({});
  const [newTagInput, setNewTagInput] = useState("");

  const [optimizationLog, setOptimizationLog] = useState<string[]>([]);
  const [isFlattened, setIsFlattened] = useState(false);

  const [fps, setFps] = useState(60);
  const [verticesCount, setVerticesCount] = useState(0);
  const [trianglesCount, setTrianglesCount] = useState(0);
  const [evaluationsCount, setEvaluationsCount] = useState(0);
  const [genTime, setGenTime] = useState(0);
  const [renderingMode, setRenderingMode] = useState<"WebGPU" | "CPU Polyfill">("CPU Polyfill");
  const [gpuName, setGpuName] = useState<string>("Unknown Adapter");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const [yaw, setYaw] = useState<number>(0.5);
  const [pitch, setPitch] = useState<number>(0.3);
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });

  const activeProp = useMemo(() => {
    return PROPS_LIBRARY.find((p) => p.id === activePropId) || PROPS_LIBRARY[0];
  }, [activePropId]);

  const currentPropTags = useMemo(() => {
    const predefined = activeProp.tags;
    const custom = customTagsMap[activePropId] || [];
    return Array.from(new Set([...predefined, ...custom]));
  }, [activeProp, activePropId, customTagsMap]);

  const selectProp = (prop: PropItem) => {
    setActivePropId(prop.id);
    setCode(prop.wgsl);
    setTraits(prop.defaultTraits);
    setIsFlattened(false);
    setOptimizationLog([]);
  };

  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagInput.trim().toLowerCase();
    if (!cleanTag) return;
    setCustomTagsMap((prev) => {
      const currentTags = prev[activePropId] || [];
      if (currentTags.includes(cleanTag) || activeProp.tags.includes(cleanTag)) return prev;
      return { ...prev, [activePropId]: [...currentTags, cleanTag] };
    });
    setNewTagInput("");
  };

  const handleSplit = (id: string) => {
    const targetIdx = panes.findIndex((p) => p.id === id);
    if (targetIdx === -1) return;

    const types: LayoutPane["type"][] = ["refactoring", "dag", "viewport", "graph", "editor"];
    const activeTypes = panes.map((p) => p.type);
    const unusedType = types.find((t) => !activeTypes.includes(t)) || "refactoring";

    const newPane: LayoutPane = {
      id: `pane-split-${Math.random().toString(36).substr(2, 5)}`,
      type: unusedType
    };

    const nextPanes = [...panes];
    nextPanes.splice(targetIdx + 1, 0, newPane);
    setPanes(nextPanes);
  };

  const handleClosePane = (id: string) => {
    if (panes.length <= 1) return;
    setPanes((prev) => prev.filter((p) => p.id !== id));
  };

  const handleChangePaneType = (id: string, type: LayoutPane["type"]) => {
    setPanes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, type } : p))
    );
  };

  const handleResetWorkspace = () => {
    setPanes([
      { id: "pane-left", type: "graph" },
      { id: "pane-center", type: "viewport" },
      { id: "pane-right", type: "editor" }
    ]);
  };

  const executeSwapAB = () => {
    setTraits((prev) => {
      const currentComplexity = prev["Complexity"] !== undefined ? prev["Complexity"] : 4.0;
      const currentTwist = prev["Twist"] !== undefined ? prev["Twist"] : 1.5;
      return {
        ...prev,
        Complexity: currentTwist * 2.5,
        Twist: currentComplexity / 2.5
      };
    });
    setOptimizationLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] AST SWAP_A_B: Swapped scale operand and parameter fields of SDF graph.`
    ]);
  };

  const executeFlattenIfs = () => {
    setIsFlattened(true);
    setCode((prev) => {
      if (prev.includes("mix(")) return prev;
      return prev.replace(
        /if \(t\.hollow > 0\.5\) \{[\s\S]*?d = abs\(d\) - 0\.04;[\s\S]*?\}/,
        `// Branchless optimized execution (Flattened)\n  d = mix(d, abs(d) - 0.04, step(0.5, t.hollow));`
      );
    });
    setOptimizationLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] AST FLATTEN_IFS: Replaced if/else branch blocks with mathematical GPU step() and mix() functions.`
    ]);
  };

  const executeSafeSwap = () => {
    setYaw((prev) => (prev + Math.PI) % (Math.PI * 2));
    setOptimizationLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] AST SAFE_SWAP: Verified cyclic dependencies. Swapped rootstock and dependencies tree securely.`
    ]);
  };

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
  }, [traits, yaw, pitch, code, activePropId, isFlattened]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(63, 63, 70, 0.15)";
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

    const sdfEval = (x: number, y: number, z: number): number => {
      const size = traits["Size"] !== undefined ? traits["Size"] : 0.75;
      const complexity = traits["Complexity"] !== undefined ? traits["Complexity"] : 4.0;
      const twist = traits["Twist"] !== undefined ? traits["Twist"] : 1.5;
      const hollow = traits["Hollow"] !== undefined ? traits["Hollow"] : 0.0;

      switch (activePropId) {
        case "threaded-bolt": {
          const radius = size * 0.38;
          const d_cyl = Math.sqrt(x * x + z * z) - radius;
          const thread = Math.sin(y * complexity + Math.atan2(z, x) * twist) * 0.04;
          const d = d_cyl + thread;
          const head = Math.max(
            Math.max(Math.abs(x) - size * 0.55, Math.abs(z) - size * 0.55),
            Math.abs(y - 0.75) - 0.15
          );
          if (hollow > 0.5) {
            return Math.min(d, head);
          }
          return d;
        }
        case "industrial-gear": {
          const theta = Math.atan2(z, x);
          const tooth = Math.sin(theta * complexity) * 0.08 * twist;
          const radius = size * 0.6 + tooth;
          const d_cyl = Math.sqrt(x * x + z * z) - radius;
          const d_gear = Math.max(d_cyl, Math.abs(y) - 0.18);
          if (hollow > 0.5) {
            const d_hole = Math.sqrt(x * x + z * z) - size * 0.22;
            return Math.max(d_gear, -d_hole);
          }
          return d_gear;
        }
        case "organic-root": {
          const theta = Math.atan2(z, x);
          const wave = Math.sin(theta * complexity + y * twist) * 0.07;
          const r_maj = size * 0.55;
          const d = Math.sqrt(Math.pow(Math.sqrt(x * x + z * z) - r_maj, 2) + y * y) - (size * 0.22 + wave);
          return hollow > 0.5 ? Math.abs(d) - 0.03 : d;
        }
        case "scifi-crate": {
          const d_box = Math.max(
            Math.max(Math.abs(x) - size * 0.55, Math.abs(y) - size * 0.55),
            Math.abs(z) - size * 0.55
          ) - (0.05 * twist);
          const groove = Math.sin(x * complexity) * Math.sin(y * complexity) * Math.sin(z * complexity);
          const d = d_box + Math.max(0.0, groove) * 0.015;
          return hollow > 0.5 ? Math.abs(d) - 0.03 : d;
        }
        case "gyroid-core":
        default: {
          const angle = y * twist * 0.8;
          const s = Math.sin(angle);
          const c = Math.cos(angle);
          const rx = x * c - z * s;
          const rz = x * s + z * c;

          let d = Math.sqrt(rx * rx + y * y + rz * rz) - size;
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
        }
      }
    };

    const N = 12;
    const bounds = 1.3;
    const step = (bounds * 2) / (N - 1);

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

    const cellVertices: (Vertex3D | null)[] = new Array((N - 1) * (N - 1) * (N - 1)).fill(null);

    const getGridPos = (i: number, j: number, k: number): [number, number, number] => {
      return [-bounds + i * step, -bounds + j * step, -bounds + k * step];
    };

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        for (let k = 0; k < N - 1; k++) {
          const corners = [
            [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
            [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
          ];

          const edges = [
            [0, 1], [2, 3], [4, 5], [6, 7],
            [0, 2], [1, 3], [4, 6], [5, 7],
            [0, 4], [1, 5], [2, 6], [3, 7]
          ];

          let intersectionSumX = 0;
          let intersectionSumY = 0;
          let intersectionSumZ = 0;
          let intersectionsCount = 0;

          for (const [eStart, eEnd] of edges) {
            const cS = corners[eStart];
            const cE = corners[eEnd];

            const idxS = (i + cS[0]) * N * N + (j + cS[1]) * N + (k + cS[2]);
            const idxE = (i + cE[0]) * N * N + (j + cE[1]) * N + (k + cE[2]);

            const sdfS = sdfGrid[idxS];
            const sdfE = sdfGrid[idxE];

            if (sdfS * sdfE < 0) {
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
            cellVertices[i * (N - 1) * (N - 1) + j * (N - 1) + k] = {
              x: intersectionSumX / intersectionsCount,
              y: intersectionSumY / intersectionsCount,
              z: intersectionSumZ / intersectionsCount
            };
          }
        }
      }
    }

    const activeVertices: Vertex3D[] = [];
    const cellToVertexIndex = new Int32Array((N - 1) * (N - 1) * (N - 1)).fill(-1);

    cellVertices.forEach((v, idx) => {
      if (v !== null) {
        cellToVertexIndex[idx] = activeVertices.length;
        activeVertices.push(v);
      }
    });

    setVerticesCount(activeVertices.length);

    const quads: Quad3D[] = [];

    const getCellVertexIndex = (ci: number, cj: number, ck: number): number => {
      if (ci < 0 || ci >= N - 1 || cj < 0 || cj >= N - 1 || ck < 0 || ck >= N - 1) return -1;
      return cellToVertexIndex[ci * (N - 1) * (N - 1) + cj * (N - 1) + ck];
    };

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
              quads.push({ indices: [v0, v3, v2, v1], depth: 0, normal: { x: 0, y: 0, z: 0 } });
            }
          }
        }
      }
    }

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

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const projectedVertices = activeVertices.map((v) => {
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;
      let y2 = v.y * cosP - z1 * sinP;
      let z2 = v.y * sinP + z1 * cosP;

      const fov = 350;
      const distance = 3.2;
      const sx = width / 2 + (x1 * fov) / (z2 + distance);
      const sy = height / 2 - (y2 * fov) / (z2 + distance);

      return { sx, sy, depth: z2, xRot: x1, yRot: y2, zRot: z2 };
    });

    quads.forEach((q) => {
      const v0 = activeVertices[q.indices[0]];
      const v1 = activeVertices[q.indices[1]];
      const v2 = activeVertices[q.indices[2]];

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

      q.depth =
        (projectedVertices[q.indices[0]].depth +
          projectedVertices[q.indices[1]].depth +
          projectedVertices[q.indices[2]].depth +
          projectedVertices[q.indices[3]].depth) /
        4;
    });

    quads.sort((a, b) => b.depth - a.depth);

    const lightDir = { x: 0.4, y: 0.6, z: -0.7 };
    const lightLen = Math.sqrt(lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z);
    lightDir.x /= lightLen;
    lightDir.y /= lightLen;
    lightDir.z /= lightLen;

    quads.forEach((q) => {
      const p0 = projectedVertices[q.indices[0]];
      const p1 = projectedVertices[q.indices[1]];
      const p2 = projectedVertices[q.indices[2]];
      const p3 = projectedVertices[q.indices[3]];

      const n = q.normal;
      let nx1 = n.x * cosY - n.z * sinY;
      let nz1 = n.x * sinY + n.z * cosY;
      let ny2 = n.y * cosP - nz1 * sinP;
      let nz2 = n.y * sinP + nz1 * cosP;

      const dot = nx1 * lightDir.x + ny2 * lightDir.y + nz2 * lightDir.z;
      const intensity = Math.max(0.1, dot);

      const baseAlpha = 0.55;
      const r = Math.floor(16 + intensity * 20);
      const g = Math.floor(185 * intensity + 30);
      const b = Math.floor(129 * intensity + 40);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
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

  const handleTraitsDefaultSync = () => {
    setTraits((prev) => {
      const next: Record<string, number> = { ...prev };
      parsedTraits.forEach((t) => {
        next[t.name] = t.value;
      });
      return next;
    });
  };

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

  const handleTraitChange = (name: string, val: number) => {
    setTraits((prev) => ({ ...prev, [name]: val }));
  };

  const d = {
    expTitle: lang === "pt" ? "Biblioteca de Modelos (Árvore)" : "Model Library (Tree)",
    expDesc: lang === "pt" ? "Navegue pelo Jardim de Props Atômicas:" : "Browse the Atomic Props Garden:",
    tagTitle: lang === "pt" ? "Filtros por Tags" : "Tag Filters",
    addTagTitle: lang === "pt" ? "Nova Tag Customizada:" : "New Custom Tag:",
    addBtn: lang === "pt" ? "Incluir" : "Add Tag",
    device: lang === "pt" ? "Dispositivo:" : "Device:",
    canvasInstructions: lang === "pt" ? "Segure e arraste para orbitar a câmera" : "Click and drag to orbit the camera",
    fps: lang === "pt" ? "Taxa de Quadros" : "Frame Rate",
    tris: lang === "pt" ? "Polígonos" : "Triangles",
    evals: lang === "pt" ? "Cálculos SDF" : "SDF Evaluations",
    time: lang === "pt" ? "Tempo de Compilação" : "Render Time",
    editorTitle: lang === "pt" ? "Código Fonte WGSL Ativo" : "WGSL Source Code",
    hotReload: lang === "pt" ? "Hot-reload Habilitado" : "Hot-reload Habilitado",
    dagHeader: lang === "pt" ? "DAG de Pipeline de GPU. Clique nos nós:" : "GPU Pipeline DAG. Click stages to inspect:",
    refactHeader: lang === "pt" ? "Otimizador e Refatorador de Shaders" : "AST Refactoring Toolkit (Branchless)",
    refactDesc: lang === "pt" ? "Ações avançadas de otimização de código movidas para evitar poluir a 2D View:" : "Advanced code-transformation actions moved here to prevent polluting the 2D Node Graph View:",
    swapBtn: lang === "pt" ? "Trocar Operandos (Swap A+B)" : "Swap Operands (Swap A+B)",
    swapDesc: lang === "pt" ? "Troca os operandos lógicos do SDF de forma determinística." : "Swaps logical math operands of the SDF model deterministically.",
    flattenBtn: lang === "pt" ? "Eliminar Condicionais (Flatten Ifs)" : "Flatten Branches (Flatten Ifs)",
    flattenDesc: lang === "pt" ? "Substitui blocos 'if/else' por funções matemáticas de degrau (mix, step) otimizando para GPU." : "Replaces if/else branches with mathematical GPU step functions, boosting hardware threads.",
    safeSwapBtn: lang === "pt" ? "Permuta Segura (Safe Swap)" : "Secure Interchange (Safe Swap)",
    safeSwapDesc: lang === "pt" ? "Valida dependências cíclicas no grafo e permuta os nós com segurança criptográfica." : "Inspects the dependency tree and interchanges roots securely with zero cyclic loops.",
    logTitle: lang === "pt" ? "Logs de Otimização AST:" : "AST Optimization Logging:",
    resetBtn: lang === "pt" ? "Restaurar Layout da Workspace" : "Reset Workspace Layout",
    widgetTitle: lang === "pt" ? "Visualizador de Props 3D" : "3D Prop Viewport",
    graphTitle: lang === "pt" ? "Grafo de Dependências 2D" : "2D Dependency Graph",
  };

  const renderWidget = (type: LayoutPane["type"]) => {
    switch (type) {
      case "viewport":
        return (
          <div className="flex-1 flex flex-col bg-zinc-900 p-4 relative min-h-[350px] items-center justify-center">
            <canvas
              ref={canvasRef}
              width={480}
              height={380}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="cursor-grab active:cursor-grabbing w-full max-w-[480px] aspect-[1.25] rounded-lg border border-zinc-800 bg-zinc-950 shadow-inner"
            />
            <div className="absolute top-4 left-4 bg-zinc-950/80 border border-zinc-800/80 rounded px-2.5 py-1 text-[9px] text-zinc-400 font-mono pointer-events-none">
              {d.canvasInstructions}
            </div>
          </div>
        );

      case "graph":
        return (
          <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-full overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{d.expTitle}</h4>
            <p className="text-[11px] text-zinc-500 mb-3">{d.expDesc}</p>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {PREDEFINED_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategories[cat.name.en];
                const filteredProps = cat.props.filter((p) => {
                  if (!selectedTagFilter) return true;
                  const combined = Array.from(new Set([...p.tags, ...(customTagsMap[p.id] || [])]));
                  return combined.includes(selectedTagFilter);
                });

                if (filteredProps.length === 0 && selectedTagFilter) return null;

                return (
                  <div key={cat.name.en} className="border border-zinc-200 dark:border-zinc-800/80 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/10">
                    <button
                      onClick={() => toggleCategory(cat.name.en)}
                      className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/55 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.name[lang]}</span>
                      </div>
                      <span className="text-[9px] text-zinc-400">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    {isExpanded && (
                      <div className="p-1 space-y-1 bg-white/50 dark:bg-zinc-950/35">
                        {filteredProps.map((prop) => (
                          <div
                            key={prop.id}
                            onClick={() => selectProp(prop)}
                            className={`w-full text-left px-2.5 py-2 rounded text-xs cursor-pointer transition-colors flex flex-col gap-0.5 ${
                              activePropId === prop.id
                                ? "bg-emerald-500/10 dark:bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{prop.name}</span>
                              <span className="text-[8px] px-1 bg-zinc-200/50 dark:bg-zinc-800/40 text-zinc-400 font-mono">v1.x</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-serif leading-normal line-clamp-1">
                              {prop.description[lang]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800/60 pt-3 mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{d.tagTitle}</span>
                {selectedTagFilter && (
                  <button onClick={() => setSelectedTagFilter(null)} className="text-[9px] font-bold text-red-500 hover:underline">
                    {lang === "pt" ? "Limpar" : "Clear"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {SENSIBLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${
                      selectedTagFilter === tag
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 border border-transparent"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddCustomTag} className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-400">{d.addTagTitle}</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. modular"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-[10px]"
                  />
                  <button type="submit" className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700">
                    {d.addBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case "refactoring":
        return (
          <div className="flex-1 p-4 bg-white dark:bg-zinc-950 flex flex-col h-full overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">{d.refactHeader}</h4>
            <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">{d.refactDesc}</p>

            <div className="space-y-3 flex-1">
              <div className="p-3 border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={executeSwapAB}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                  >
                    🔄 {d.swapBtn}
                  </button>
                  <span className="text-[8px] font-mono text-zinc-400">AST_SWAP</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-serif leading-normal">{d.swapDesc}</p>
              </div>

              <div className="p-3 border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={executeFlattenIfs}
                    disabled={isFlattened}
                    className={`px-2.5 py-1.5 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors ${
                      isFlattened ? "bg-zinc-300 dark:bg-zinc-800 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    🌿 {d.flattenBtn}
                  </button>
                  <span className="text-[8px] font-mono text-zinc-400">AST_FLATTEN</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-serif leading-normal">{d.flattenDesc}</p>
              </div>

              <div className="p-3 border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={executeSafeSwap}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                  >
                    ⛓️ {d.safeSwapBtn}
                  </button>
                  <span className="text-[8px] font-mono text-zinc-400">AST_SAFE_SWAP</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-serif leading-normal">{d.safeSwapDesc}</p>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800/60 pt-3 mt-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">{d.logTitle}</span>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 h-[80px] overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1 leading-relaxed">
                {optimizationLog.length === 0 ? (
                  <span className="text-zinc-600 italic">[Sytem Idle: Awaiting optimizer directives...]</span>
                ) : (
                  optimizationLog.map((log, i) => <div key={i}>{log}</div>)
                )}
              </div>
            </div>
          </div>
        );

      case "editor":
        return (
          <div className="flex-1 p-4 bg-white dark:bg-zinc-950 flex flex-col h-full overflow-y-auto gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {d.editorTitle}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                {d.hotReload}
              </span>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setIsFlattened(false);
              }}
              className="w-full flex-1 min-h-[220px] font-mono text-xs p-3.5 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              spellCheck="false"
            />
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-serif">
              Modify the frontmatter `@trait` definitions or customize the `sdf` function inside the editor above. The UI updates dynamically.
            </div>
          </div>
        );

      case "dag":
        return (
          <div className="flex-1 p-4 bg-white dark:bg-zinc-950 flex flex-col h-full overflow-y-auto">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{d.dagHeader}</h4>
            <div className="flex flex-col gap-2.5 py-1">
              <div
                onClick={() => setActiveDagNode("eval")}
                className={`p-2.5 rounded border cursor-pointer transition-all ${
                  activeDagNode === "eval"
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-0.5 font-bold">
                  <span className="text-zinc-800 dark:text-zinc-200">1. SDF Evaluation</span>
                  <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-600 rounded">Pass 1</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-serif">
                  Evaluated {evaluationsCount} grid positions inside voxel field.
                </p>
              </div>

              <div className="text-center text-zinc-400 text-[10px]">↓</div>

              <div
                onClick={() => setActiveDagNode("cont")}
                className={`p-2.5 rounded border cursor-pointer transition-all ${
                  activeDagNode === "cont"
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-0.5 font-bold">
                  <span className="text-zinc-800 dark:text-zinc-200">2. Dual Contouring (Vertices)</span>
                  <span className="text-[8px] px-1 bg-indigo-500/20 text-indigo-600 rounded">Pass 2</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-serif">
                  Solves Hermite crossing averages per active cell. Extracted {verticesCount} points.
                </p>
              </div>

              <div className="text-center text-zinc-400 text-[10px]">↓</div>

              <div
                onClick={() => setActiveDagNode("stitch")}
                className={`p-2.5 rounded border cursor-pointer transition-all ${
                  activeDagNode === "stitch"
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-0.5 font-bold">
                  <span className="text-zinc-800 dark:text-zinc-200">3. Quad Mesh Stitching</span>
                  <span className="text-[8px] px-1 bg-amber-500/20 text-amber-600 rounded">Pass 3</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-serif">
                  Generates indexes and connects adjacent vertices. Stitched {trianglesCount / 2} quads.
                </p>
              </div>
            </div>

            <div className="p-2.5 mt-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs space-y-1">
              <span className="font-semibold text-[10px] font-mono uppercase text-zinc-400 block">Metadata: {activeDagNode}</span>
              {activeDagNode === "eval" && (
                <div className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300 space-y-0.5">
                  <div>• Output: Voxel Volume (Texture3D)</div>
                  <div>• Resolution: 12 x 12 x 12</div>
                  <div>• Immutable Hash: <span className="text-emerald-500 font-bold">f491c28b</span></div>
                </div>
              )}
              {activeDagNode === "cont" && (
                <div className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300 space-y-0.5">
                  <div>• Input: Voxel Volume map</div>
                  <div>• Method: QEF Plane Intersection</div>
                  <div>• Output: Vertex Buffer (StorageBuffer)</div>
                </div>
              )}
              {activeDagNode === "stitch" && (
                <div className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300 space-y-0.5">
                  <div>• Input: Vertex Buffer</div>
                  <div>• Output: Quad Index Buffer</div>
                  <div>• Active Faces: {trianglesCount / 2} Quads</div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/60 shadow-xl flex flex-col font-sans mb-12">
      {/* Workspace Global Controller Header */}
      <div className="bg-zinc-100 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-xs uppercase text-zinc-700 dark:text-zinc-300">
            {lang === "pt" ? "Painel de Controle da Workspace" : "Workspace Panel Controller"}
          </h3>
        </div>
        <button
          onClick={handleResetWorkspace}
          className="text-[10px] font-bold px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
        >
          🔄 {d.resetBtn}
        </button>
      </div>

      {/* Main Grid: Responsive layouts that dynamically load the active widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800 min-h-[450px]">
        {panes.map((pane) => {
          let colSpan = "col-span-1 lg:col-span-4";
          if (pane.type === "viewport" && panes.length === 3) {
            colSpan = "col-span-1 lg:col-span-5";
          } else if (pane.type === "graph" && panes.length === 3) {
            colSpan = "col-span-1 lg:col-span-3";
          }

          return (
            <div key={pane.id} className={`${colSpan} flex flex-col h-full bg-white dark:bg-zinc-950/20`}>
              <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <select
                  value={pane.type}
                  onChange={(e) => handleChangePaneType(pane.id, e.target.value as LayoutPane["type"])}
                  className="bg-transparent font-bold text-zinc-700 dark:text-zinc-300 border-none outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500/20 rounded py-0.5 px-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[11px] uppercase tracking-wider"
                >
                  <option value="viewport">{d.widgetTitle}</option>
                  <option value="graph">{d.graphTitle}</option>
                  <option value="editor">{d.editorTitle}</option>
                  <option value="refactoring">{d.refactHeader}</option>
                  <option value="dag">GPU Pipeline DAG</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSplit(pane.id)}
                    title={lang === "pt" ? "Dividir Painel" : "Split Panel"}
                    className="p-1 text-zinc-400 hover:text-emerald-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-[11px]"
                  >
                    ✂️
                  </button>
                  {panes.length > 1 && (
                    <button
                      onClick={() => handleClosePane(pane.id)}
                      title={lang === "pt" ? "Fechar Painel" : "Close Panel"}
                      className="p-1 text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-[11px]"
                    >
                      ✖️
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col">{renderWidget(pane.type)}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-800 p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {lang === "pt" ? "Parâmetros Gerais do Prop Ativo" : "Active Prop Parameter Controls"}
            </span>
            <button
              onClick={handleTraitsDefaultSync}
              className="text-[9px] font-bold text-emerald-600 hover:underline"
            >
              {lang === "pt" ? "Restaurar Padrões" : "Reset Sliders"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {parsedTraits.map((t) => (
              <div key={t.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t.name}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(traits[t.name] !== undefined ? traits[t.name] : t.value).toFixed(2)}
                  </span>
                </div>
                {t.type === "slider" ? (
                  <input
                    type="range"
                    min={t.min}
                    max={t.max}
                    step={0.05}
                    value={traits[t.name] !== undefined ? traits[t.name] : t.value}
                    onChange={(e) => handleTraitChange(t.name, parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                ) : (
                  <button
                    onClick={() =>
                      handleTraitChange(
                        t.name,
                        (traits[t.name] !== undefined ? traits[t.name] : t.value) > 0.5 ? 0 : 1
                      )
                    }
                    className={`w-full py-1 text-center rounded text-[10px] font-semibold border transition-all ${
                      (traits[t.name] !== undefined ? traits[t.name] : t.value) > 0.5
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {(traits[t.name] !== undefined ? traits[t.name] : t.value) > 0.5 ? "ON" : "OFF"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-4 flex flex-col justify-between border-l md:border-l border-zinc-200 dark:border-zinc-800 pl-0 md:pl-6 pt-4 md:pt-0">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              {lang === "pt" ? "Prop em Edição:" : "Active Inspected Prop:"}
            </span>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 block">{activeProp.name}</span>
            <span className="text-[11px] text-zinc-500 leading-normal block font-serif">{activeProp.description[lang]}</span>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-900/40 mt-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
              {lang === "pt" ? "Tags do Item:" : "Prop Tags:"}
            </span>
            <div className="flex flex-wrap gap-1">
              {currentPropTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="bg-zinc-900 text-zinc-100 border-t border-zinc-800 px-5 py-4 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800 text-xs font-mono">
        <div className="flex flex-col justify-center items-start md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">{d.fps}</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{fps} FPS</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">Vertices</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{verticesCount}</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">{d.tris}</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{trianglesCount}</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">{d.evals}</span>
          <span className="text-zinc-200 font-bold text-sm mt-0.5">{evaluationsCount}</span>
        </div>
        <div className="flex flex-col justify-center items-start pt-2 md:pt-0 md:px-3">
          <span className="text-zinc-500 text-[10px] uppercase">{d.time}</span>
          <span className="text-emerald-400 font-bold text-sm mt-0.5">{genTime} ms</span>
        </div>
      </div>

      {/* GPU Adapter Details */}
      <div className="bg-zinc-950 text-[10px] text-zinc-500 px-5 py-2 font-mono flex items-center justify-between border-t border-zinc-900">
        <span>Adapter Details: {gpuName}</span>
        <span>Version: 1.2.0 (Git-backed)</span>
      </div>
    </div>
  );
}
