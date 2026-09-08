"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

const N = 32;
const K = 32;
const M = 32;

function createDataTexture(w: number, h: number, isA: boolean) {
  const size = w * h * 4;
  const data = new Float32Array(size);
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      const u = (i / w) * Math.PI * 2.0;
      const v = (j / h) * Math.PI * 2.0;
      // Generate some smooth and interesting complex fields
      const freq = isA ? 1.5 : 2.5;
      const mag = 0.4 + 0.6 * Math.abs(Math.sin(u * freq + v));
      const phase = isA ? u + v * 2.0 : u * 2.0 - v;
      
      const re = mag * Math.cos(phase);
      const im = mag * Math.sin(phase);
      
      const idx = (j * w + i) * 4;
      data[idx] = re;
      data[idx + 1] = im;
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
vec3 pColor = hsv2rgb(vec3(phase / 6.2831853 + 0.5, 0.9, 0.9));

// Continuous orientation texture
vec2 dir = normalize(vComplex + vec2(1e-6));
float proj = dot(vLocalPos.xz * 12.0, dir);
float pattern = sin(proj * 6.2831853);
pattern = smoothstep(-0.1, 0.1, pattern);

vec3 finalColor = mix(pColor, vec3(1.0), pattern * 0.3);
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
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', colorFragment);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', emissiveFragment);
  };
}

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
  
  transformed *= gapScale;
  transformed.y *= h * 5.0; // Scale height visually

  float fN = float(u_N); float fK = float(u_K); float fM = float(u_M);
  vec3 posFloor = vec3(float(i) - fN/2.0 + 0.5, 0.0, float(k) - fK/2.0 + 0.5);
  vec3 posWall = vec3(float(i) - fN/2.0 + 0.5, float(k) - fK/2.0 + 0.5, (copy == 0 ? -fM : fM)/2.0);

  transformed += mix(posFloor, posWall, u_lift);
  vVisibility = (copy == 1) ? u_duplicate : 1.0;
  vLocalPos = position;
`;

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
  
  transformed *= gapScale;
  transformed.y *= h * 5.0;

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
  // Lambda is slightly larger for sum to avoid early capping
  float h = max(0.01, 1.0 - exp(-r / (u_lambda * 4.0))); 
  
  float gapScale = mix(1.0, 0.9, u_gap);
  transformed *= gapScale;
  transformed.y *= h * 10.0; // Taller for visibility

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
  const targetTRef = useRef(0);

  useEffect(() => {
    targetTRef.current = STEPS[activeStep].t;
  }, [activeStep]);

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
      u_K: { value: K },
      u_N: { value: N },
      u_M: { value: M },
      texA: { value: texA },
      texB: { value: texB },
    };

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    boxGeo.translate(0, 0.5, 0);

    const matA = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, side: THREE.DoubleSide });
    patchMaterial(matA, sharedUniforms, vertexA);
    const meshA = new THREE.InstancedMesh(boxGeo, matA, N * K * 2);
    scene.add(meshA);

    const matB = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, side: THREE.DoubleSide });
    patchMaterial(matB, sharedUniforms, vertexB);
    const meshB = new THREE.InstancedMesh(boxGeo, matB, K * M * 2);
    scene.add(meshB);

    const matVol = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    patchMaterial(matVol, sharedUniforms, vertexVolume);
    const meshVol = new THREE.InstancedMesh(boxGeo, matVol, N * K * M);
    scene.add(meshVol);

    const matC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3, transparent: true, side: THREE.DoubleSide });
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

  return (
    <div className="relative w-full h-[600px] md:h-[700px] bg-[#09090b] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 my-8">
      <div ref={containerRef} className="absolute inset-0" />
      
      <div className="absolute top-4 left-4 z-10 w-64 md:w-80 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 backdrop-blur-md shadow-2xl">
        <h2 className="text-emerald-400 font-bold mb-1 text-sm md:text-base flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Cálculo Tensorial Contínuo
        </h2>
        <div className="text-xs text-zinc-400 mb-4 font-mono">
          <InlineMath math="C(x,y) = \int A(x,t)B(t,y) dt" />
        </div>
        
        <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          {STEPS.map((step, i) => (
            <button 
              key={i}
              onClick={() => setActiveStep(i)}
              className={`block w-full text-left px-3 py-2 text-xs md:text-sm rounded-lg transition-all font-medium border ${
                activeStep === i 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-inner' 
                  : 'hover:bg-zinc-800/50 text-zinc-400 border-transparent hover:border-zinc-700/50'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 text-zinc-500 text-[10px] uppercase tracking-widest font-mono text-right">
        <div>Mouse para orbitar</div>
        <div>Scroll para zoom</div>
      </div>
    </div>
  );
}
