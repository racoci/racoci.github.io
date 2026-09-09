"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

const N = 12;
const K = 12;
const M = 12;

type Complex = { re: number; im: number };

function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

// Generate the deterministic complex matrices for accurate 2D Trajectory Math on the CPU
const matrixA: Complex[][] = Array.from({ length: N }, (_, i) =>
  Array.from({ length: K }, (_, k) => {
    const u = (i / N) * Math.PI * 2.0;
    const v = (k / K) * Math.PI * 2.0;
    const mag = 0.4 + 0.6 * Math.abs(Math.sin(u * 1.5 + v));
    const phase = u + v * 2.0;
    return { re: mag * Math.cos(phase), im: mag * Math.sin(phase) };
  })
);

const matrixB: Complex[][] = Array.from({ length: K }, (_, k) =>
  Array.from({ length: M }, (_, j) => {
    const u = (k / K) * Math.PI * 2.0;
    const v = (j / M) * Math.PI * 2.0;
    const mag = 0.4 + 0.6 * Math.abs(Math.sin(u * 2.5 + v));
    const phase = u * 2.0 - v;
    return { re: mag * Math.cos(phase), im: mag * Math.sin(phase) };
  })
);

function createDataTexture(w: number, h: number, isA: boolean) {
  const size = w * h * 4;
  const data = new Float32Array(size);
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      const cell = isA ? matrixA[i][j] : matrixB[i][j];
      const idx = (j * w + i) * 4;
      data[idx] = cell.re;
      data[idx + 1] = cell.im;
      data[idx + 2] = 0;
      data[idx + 3] = 0;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}

const fragmentPre = `
varying vec2 vComplex;
varying vec3 vLocalPos;
varying float vVisibility;

uniform float u_colorMode;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

const colorFragment = `
#include <color_fragment>
if (vVisibility < 0.01) discard;

float phase = atan(vComplex.y, vComplex.x);

vec3 pColor;
if (u_colorMode == 0.0) {
    pColor = hsv2rgb(vec3(phase / 6.2831853 + 0.5, 0.8, 0.9));
} else if (u_colorMode == 1.0) {
    float re = vComplex.x;
    float im = vComplex.y;
    pColor = vec3(max(0.0, re), max(0.0, im), max(0.0, -re));
} else if (u_colorMode == 2.0) {
    pColor = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), phase / 6.2831853 + 0.5);
} else {
    pColor = vec3(0.7); // Monochrome Zinc
}

// Continuous orientation texture (anisotropy)
vec2 dir = normalize(vComplex + vec2(1e-6));
float proj = dot(vLocalPos.xz * 12.0, dir);
float pattern = sin(proj * 6.2831853);
pattern = smoothstep(-0.1, 0.1, pattern);

vec3 finalColor = mix(pColor, vec3(1.0), pattern * 0.25);
diffuseColor = vec4(finalColor, min(1.0, vVisibility));
`;

const emissiveFragment = `
#include <emissivemap_fragment>
if (vVisibility > 1.0) {
    totalEmissiveRadiance += diffuseColor.rgb * (vVisibility - 1.0);
}
`;

function patchMaterial(mat: THREE.Material, sharedUniforms: any, vertexLogic: string) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms = { ...shader.uniforms, ...sharedUniforms };
    shader.vertexShader = `
      uniform float u_lift;
      uniform float u_duplicate;
      uniform float u_floorOpacity;
      uniform float u_manyFloors;
      uniform float u_gap;
      uniform float u_isSweeping;
      uniform float u_sliceSweep;
      uniform float u_volOpacity;
      uniform float u_accOpacity;
      uniform float u_lambda;
      uniform int u_K;
      uniform int u_N;
      uniform int u_M;
      uniform sampler2D texA;
      uniform sampler2D texB;
      varying vec2 vComplex;
      varying vec3 vLocalPos;
      varying float vVisibility;
    \n` + shader.vertexShader;
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n${vertexLogic}`
    );
    
    shader.fragmentShader = fragmentPre + shader.fragmentShader;
    
    // Perturb normals based on the complex phase (Physical Anisotropy)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `
      #include <normal_fragment_begin>
      vec2 pDir = normalize(vComplex + vec2(1e-6));
      vec3 perturb = vec3(pDir.x, 0.0, pDir.y) * 0.55;
      normal = normalize(normal + perturb);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', colorFragment);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', emissiveFragment);
  };
}

// West/East wall: height scales along local Y and transforms to grow perpendicular along local Z (perpendicular to XY wall)
const vertexA = `
  int realID = gl_InstanceID;
  int copy = realID / (u_N * u_K);
  int id = realID % (u_N * u_K);
  int i = id % u_N;
  int k = id / u_N;

  vec2 val = texelFetch(texA, ivec2(i, k), 0).xy;
  vComplex = val;

  float r = length(val);
  float h = max(0.01, 1.0 - exp(-r / u_lambda));
  float gapScale = mix(1.0, 0.9, u_gap);
  
  // Custom height orientation along Z axis (orthogonal to XY plane)
  vec3 local = position;
  local.y *= h * 5.0; 
  transformed = vec3(local.x * gapScale, local.z * gapScale, (copy == 0 ? -1.0 : 1.0) * local.y);

  float fN = float(u_N); float fK = float(u_K); float fM = float(u_M);
  vec3 posFloor = vec3(float(i) - fN/2.0 + 0.5, 0.0, float(k) - fK/2.0 + 0.5);
  vec3 posWall = vec3(float(i) - fN/2.0 + 0.5, float(k) - fK/2.0 + 0.5, (copy == 0 ? -fM : fM)/2.0);

  transformed += mix(posFloor, posWall, u_lift);
  vVisibility = (copy == 1) ? u_duplicate : 1.0;
  vLocalPos = position;
`;

// South/North wall: height scales along local Y and transforms to grow perpendicular along local X (perpendicular to YZ wall)
const vertexB = `
  int realID = gl_InstanceID;
  int copy = realID / (u_K * u_M);
  int id = realID % (u_K * u_M);
  int k = id % u_K;
  int j = id / u_K;

  vec2 val = texelFetch(texB, ivec2(k, j), 0).xy;
  vComplex = val;

  float r = length(val);
  float h = max(0.01, 1.0 - exp(-r / u_lambda));
  float gapScale = mix(1.0, 0.9, u_gap);
  
  // Custom height orientation along X axis (orthogonal to YZ plane)
  vec3 local = position;
  local.y *= h * 5.0;
  transformed = vec3((copy == 0 ? -1.0 : 1.0) * local.y, local.x * gapScale, local.z * gapScale);

  float fN = float(u_N); float fK = float(u_K); float fM = float(u_M);
  vec3 posFloor = vec3(float(k) - fK/2.0 + 0.5, 0.0, float(j) - fM/2.0 + 0.5);
  vec3 posWall = vec3((copy == 0 ? -fN : fN)/2.0, float(k) - fK/2.0 + 0.5, float(j) - fM/2.0 + 0.5);

  transformed += mix(posFloor, posWall, u_lift);
  vVisibility = (copy == 1) ? u_duplicate : 1.0;
  vLocalPos = position;
`;

const vertexVolume = `
  int id = gl_InstanceID;
  int i = id % u_N;
  int k = (id / u_N) % u_K;
  int j = id / (u_N * u_K);

  vec2 a = texelFetch(texA, ivec2(i, k), 0).xy;
  vec2 b = texelFetch(texB, ivec2(k, j), 0).xy;
  vec2 val = vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
  vComplex = val;

  float r = length(val);
  float h = max(0.01, 1.0 - exp(-r / u_lambda));
  float gapScale = mix(1.0, 0.9, u_gap);
  
  transformed *= gapScale;
  transformed.y *= h * 5.0;

  float fN = float(u_N); float fK = float(u_K); float fM = float(u_M);
  transformed += vec3(float(i) - fN/2.0 + 0.5, float(k) - fK/2.0 + 0.5, float(j) - fM/2.0 + 0.5);

  float isMiddle = abs(float(k) - fK/2.0) < 1.0 ? 1.0 : 0.0;
  float vis = mix(isMiddle, 1.0, u_manyFloors) * u_floorOpacity;

  float sliceK = u_sliceSweep * fK;
  float dist = float(k) - sliceK;
  float sweepVis = (dist >= 0.0) ? 1.0 : 0.05;
  float glow = smoothstep(1.5, 0.0, abs(dist)) * 2.0;

  if (u_isSweeping > 0.5) {
      vis = vis * sweepVis + glow;
  }
  vVisibility = vis * u_volOpacity;
  vLocalPos = position;
`;

const vertexC = `
  int id = gl_InstanceID;
  int i = id % u_N;
  int j = id / u_N;

  float fK = float(u_K);
  float kLimit = u_sliceSweep * fK;
  int maxK = int(floor(kLimit));
  float frac = fract(kLimit);

  vec2 sum = vec2(0.0);
  for(int k = 0; k < 200; k++) {
      if(k >= maxK || k >= u_K) break;
      vec2 a = texelFetch(texA, ivec2(i, k), 0).xy;
      vec2 b = texelFetch(texB, ivec2(k, j), 0).xy;
      sum += vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
  }
  if (frac > 0.0 && maxK < u_K) {
      vec2 a = texelFetch(texA, ivec2(i, maxK), 0).xy;
      vec2 b = texelFetch(texB, ivec2(maxK, j), 0).xy;
      sum += vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x) * frac;
  }

  vComplex = sum;
  float r = length(sum);
  // Scale heights for sum
  float h = max(0.01, 1.0 - exp(-r / (u_lambda * 4.0))); 
  
  float gapScale = mix(1.0, 0.9, u_gap);
  transformed *= gapScale;
  transformed.y *= h * 10.0; 

  float fN = float(u_N); float fM = float(u_M);
  transformed += vec3(float(i) - fN/2.0 + 0.5, 0.0, float(j) - fM/2.0 + 0.5);

  vVisibility = u_accOpacity;
  vLocalPos = position;
`;

const STEPS = [
  { t: 0, label: "0. Matrizes A e B Iniciais" },
  { t: 1, label: "1. Transmutação em Paredes" },
  { t: 2, label: "2. Duplicação Ortogonal" },
  { t: 3, label: "3. Produto Externo (Posto 1)" },
  { t: 4, label: "4. Alinhamento de Fases" },
  { t: 5, label: "5. Múltiplas Camadas (Discreto)" },
  { t: 6, label: "6. Volume Contínuo" },
  { t: 7.2, label: "7. Fatia de Integração dt" },
  { t: 9, label: "8. Soma Complexa e Reconstrução" }
];

export default function MatrixMultiplicationVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [colorMode, setColorMode] = useState(0); // 0: Hue, 1: Re/Im, 2: Neon, 3: Mono
  const [selectedCell, setSelectedCell] = useState<{ i: number; j: number } | null>(null);

  const targetTRef = useRef(0);
  const uniformsRef = useRef<any>(null);

  useEffect(() => {
    targetTRef.current = STEPS[activeStep].t;
  }, [activeStep]);

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_colorMode.value = colorMode;
    }
  }, [colorMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#09090b");

    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(45, 45, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(20, 50, 20);
    scene.add(dirLight);

    const texA = createDataTexture(N, K, true);
    const texB = createDataTexture(K, M, false);

    const sharedUniforms = {
      u_lift: { value: 0 },
      u_duplicate: { value: 0 },
      u_floorOpacity: { value: 0 },
      u_manyFloors: { value: 0 },
      u_gap: { value: 1 },
      u_isSweeping: { value: 0 },
      u_sliceSweep: { value: 0 },
      u_volOpacity: { value: 0 },
      u_accOpacity: { value: 0 },
      u_lambda: { value: 1.0 },
      u_colorMode: { value: colorMode },
      u_K: { value: K },
      u_N: { value: N },
      u_M: { value: M },
      texA: { value: texA },
      texB: { value: texB },
    };
    uniformsRef.current = sharedUniforms;

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);

    const matA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.1, transparent: true, side: THREE.DoubleSide });
    patchMaterial(matA, sharedUniforms, vertexA);
    const meshA = new THREE.InstancedMesh(boxGeo, matA, N * K * 2);
    scene.add(meshA);

    const matB = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.1, transparent: true, side: THREE.DoubleSide });
    patchMaterial(matB, sharedUniforms, vertexB);
    const meshB = new THREE.InstancedMesh(boxGeo, matB, K * M * 2);
    scene.add(meshB);

    const matVol = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    patchMaterial(matVol, sharedUniforms, vertexVolume);
    const meshVol = new THREE.InstancedMesh(boxGeo, matVol, N * K * M);
    scene.add(meshVol);

    const matC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.3, transparent: true, side: THREE.DoubleSide });
    patchMaterial(matC, sharedUniforms, vertexC);
    const meshC = new THREE.InstancedMesh(boxGeo, matC, N * M);
    scene.add(meshC);

    const cl = (val: number, min: number, max: number) => Math.max(0, Math.min(1, (val - min) / (max - min)));

    let currentT = 0;
    let reqId: number;

    const loop = () => {
      currentT += (targetTRef.current - currentT) * 0.05;

      sharedUniforms.u_lift.value = cl(currentT, 0, 1);
      sharedUniforms.u_duplicate.value = cl(currentT, 1, 2);
      sharedUniforms.u_floorOpacity.value = cl(currentT, 2, 3);
      sharedUniforms.u_manyFloors.value = cl(currentT, 4, 5);

      let gap = 1.0;
      if (currentT >= 5 && currentT < 8) gap = 1.0 - cl(currentT, 5, 6);
      if (currentT >= 8) gap = cl(currentT, 8, 9);
      sharedUniforms.u_gap.value = gap;

      if (currentT >= 6 && currentT < 8) {
        sharedUniforms.u_isSweeping.value = 1.0;
        sharedUniforms.u_sliceSweep.value = cl(currentT, 6, 7.5);
      } else {
        sharedUniforms.u_isSweeping.value = 0.0;
        sharedUniforms.u_sliceSweep.value = currentT >= 8 ? 1.0 : 0.0;
      }

      sharedUniforms.u_volOpacity.value = 1.0 - cl(currentT, 7.5, 8.0);
      sharedUniforms.u_accOpacity.value = cl(currentT, 6, 6.2);

      controls.update();
      renderer.render(scene, camera);
      reqId = requestAnimationFrame(loop);
    };
    loop();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(reqId);
      renderer.dispose();
      boxGeo.dispose();
      matA.dispose();
      matB.dispose();
      matVol.dispose();
      matC.dispose();
      texA.dispose();
      texB.dispose();
    };
  }, []);

  // Compute 2D vector trajectory for the selected cell
  const getSelectedCellData = () => {
    if (!selectedCell) return null;
    const { i, j } = selectedCell;
    const trajectory: { start: Complex; end: Complex; term: Complex }[] = [];
    let currentSum = { re: 0, im: 0 };
    for (let k = 0; k < K; k++) {
      const aVal = matrixA[i][k];
      const bVal = matrixB[k][j];
      const term = complexMul(aVal, bVal);
      const nextSum = complexAdd(currentSum, term);
      trajectory.push({ start: currentSum, end: nextSum, term });
      currentSum = nextSum;
    }
    return { trajectory, finalSum: currentSum };
  };

  const trajData = getSelectedCellData();

  return (
    <div className="relative w-full h-[600px] md:h-[700px] bg-[#09090b] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 my-8 font-sans">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Sidebar Controls */}
      <div className="absolute top-4 left-4 z-10 w-64 md:w-80 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 backdrop-blur-md shadow-2xl flex flex-col gap-4">
        <div>
          <h2 className="text-emerald-400 font-bold mb-1 text-sm md:text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cálculo Tensorial Contínuo
          </h2>
          <div className="text-xs text-zinc-400 font-mono">
            <InlineMath math="C(x,y) = \int A(x,t)B(t,y) dt" />
          </div>
        </div>

        {/* Color Encoding Select */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5 block">Codificação de Cor Complexa</label>
          <div className="grid grid-cols-2 gap-1">
            {["Hue-Map", "Re/Im Real", "Neon High", "Monocromo"].map((lbl, idx) => (
              <button
                key={idx}
                onClick={() => setColorMode(idx)}
                className={`text-[10px] font-medium py-1 px-1.5 rounded border transition-colors ${
                  colorMode === idx ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-900/50 hover:bg-zinc-800 border-transparent text-zinc-400"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        
        {/* Steps */}
        <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          {STEPS.map((step, i) => (
            <button 
              key={i}
              onClick={() => setActiveStep(i)}
              className={`block w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all font-medium border ${
                activeStep === i 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-inner' 
                  : 'hover:bg-zinc-800/50 text-zinc-400 border-transparent hover:border-zinc-700/50'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* Cell Selector Input */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5 block">Soma Complexa Localizada (Célula)</label>
          <div className="flex gap-2">
            <input 
              type="number" min="0" max={N - 1} placeholder={`i (0-${N-1})`}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 0 && val < N) {
                  setSelectedCell(prev => ({ i: val, j: prev?.j || 0 }));
                }
              }}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 w-full"
            />
            <input 
              type="number" min="0" max={M - 1} placeholder={`j (0-${M-1})`}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 0 && val < M) {
                  setSelectedCell(prev => ({ i: prev?.i || 0, j: val }));
                }
              }}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 w-full"
            />
          </div>
        </div>
      </div>

      {/* Trajectory Floating Panel (Complex plane addition) */}
      {selectedCell && trajData && (
        <div className="absolute top-4 right-4 z-10 w-72 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 backdrop-blur-md shadow-2xl flex flex-col gap-3 font-mono text-[11px] text-zinc-400">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
            <span className="font-bold text-emerald-400 text-xs">Trajetória no Plano Complexo</span>
            <button onClick={() => setSelectedCell(null)} className="text-zinc-600 hover:text-zinc-300">✕</button>
          </div>
          <div>Célula Selecionada: <span className="text-zinc-100 font-bold">({selectedCell.i}, {selectedCell.j})</span></div>
          
          {/* Custom SVG Graph representing cartesian vector additions */}
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-2 flex items-center justify-center">
            <svg viewBox="-120 -120 240 240" className="w-48 h-48 overflow-visible">
              {/* Grid Lines */}
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#27272a" strokeWidth="1" />
              <line x1="0" y1="-120" x2="0" y2="120" stroke="#27272a" strokeWidth="1" />
              
              {/* Grid circles */}
              <circle cx="0" cy="0" r="30" fill="none" stroke="#18181b" strokeWidth="1" />
              <circle cx="0" cy="0" r="60" fill="none" stroke="#18181b" strokeWidth="1" />
              <circle cx="0" cy="0" r="90" fill="none" stroke="#18181b" strokeWidth="1" />

              {/* Vector polyline addition */}
              {trajData.trajectory.map((step, idx) => {
                const scale = 25.0; // scale complex coordinates for beautiful view
                return (
                  <g key={idx}>
                    <line 
                      x1={step.start.re * scale} 
                      y1={-step.start.im * scale} 
                      x2={step.end.re * scale} 
                      y2={-step.end.im * scale} 
                      stroke={idx === K - 1 ? "#10b981" : "#a855f7"} 
                      strokeWidth={idx === K - 1 ? "2.5" : "1.5"} 
                    />
                    <circle cx={step.end.re * scale} cy={-step.end.im * scale} r="2" fill="#fbbf24" />
                  </g>
                );
              })}
              {/* Origin node */}
              <circle cx="0" cy="0" r="3" fill="#ef4444" />
              
              <text x="100" y="-5" fill="#3f3f46" fontSize="8">Re</text>
              <text x="5" y="-100" fill="#3f3f46" fontSize="8">Im</text>
            </svg>
          </div>

          <div className="space-y-1 leading-normal">
            <div>
              Soma Complexa Final: 
              <span className="text-emerald-400 block font-bold">
                {trajData.finalSum.re.toFixed(4)} + {trajData.finalSum.im.toFixed(4)}i
              </span>
            </div>
            <div>Magnitude: <span className="text-zinc-200">{Math.sqrt(trajData.finalSum.re**2 + trajData.finalSum.im**2).toFixed(4)}</span></div>
            <div>Fase: <span className="text-zinc-200">{(Math.atan2(trajData.finalSum.im, trajData.finalSum.re) * 180 / Math.PI).toFixed(1)}°</span></div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 text-zinc-500 text-[10px] uppercase tracking-widest font-mono text-right pointer-events-none">
        <div>Mouse para orbitar</div>
        <div>Scroll para zoom</div>
      </div>
    </div>
  );
}
