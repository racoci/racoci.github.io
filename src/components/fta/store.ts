import { useState, useEffect } from 'react';

export type Complex = { re: number; im: number };

// Arithmetic
export const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const cMul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const cDiv = (a: Complex, b: Complex): Complex => {
  const den = b.re * b.re + b.im * b.im;
  if (den === 0) return { re: 0, im: 0 };
  return { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den };
};
export const cAbs = (a: Complex): number => Math.sqrt(a.re * a.re + a.im * a.im);

// Continued fractions approximation
export function approximateDecimal(val: number, maxDepth: number): { num: number, den: number } {
  if (maxDepth === 0) return { num: Math.round(val), den: 1 };
  const sign = Math.sign(val);
  val = Math.abs(val);
  const floor = Math.floor(val);
  const diff = val - floor;
  if (diff < 1e-6 || maxDepth <= 1) return { num: sign * floor, den: 1 };
  
  let p0 = 1, q0 = 0;
  let p1 = floor, q1 = 1;
  let x = val;
  for (let i = 1; i < maxDepth; i++) {
    x = 1 / (x - Math.floor(x));
    const a = Math.floor(x);
    const p2 = a * p1 + p0;
    const q2 = a * q1 + q0;
    p0 = p1; q0 = q1;
    p1 = p2; q1 = q2;
    if (Math.abs(val - p1 / q1) < 1e-6) break;
  }
  return { num: sign * p1, den: q1 };
}

export function formatComplexFraction(c: Complex, depth: number): string {
    const formatFrac = (v: number) => {
        if (Math.abs(v - Math.round(v)) < 1e-6 || depth === 0) return Math.round(v).toString();
        const {num, den} = approximateDecimal(v, depth);
        if (den === 1) return num.toString();
        return `${num}/${den}`;
    };
    const reStr = formatFrac(c.re);
    const imStr = formatFrac(c.im);
    if (Math.abs(c.im) < 1e-6) return reStr;
    if (Math.abs(c.re) < 1e-6) {
        if (imStr === '1') return 'i';
        if (imStr === '-1') return '-i';
        return `${imStr}i`;
    }
    const imSign = c.im > 0 ? '+' : '-';
    let imPart = formatFrac(Math.abs(c.im));
    if (imPart === '1') imPart = '';
    return `${reStr} ${imSign} ${imPart}i`;
}

// Convert string like "1/2 + 3/4i" or "-1.5i" to Complex
export function parseComplex(str: string): Complex {
  str = str.replace(/\s+/g, '');
  let re = 0, im = 0;
  
  if (str === '') return { re, im };
  
  // Basic parsing
  const signMatch = str.match(/(?:[+-]?[^+i-]+)/g);
  if (!signMatch) return { re, im };
  
  const parsePart = (s: string) => {
    const hasI = s.includes('i');
    s = s.replace('i', '');
    if (s === '' || s === '+') s = '1';
    if (s === '-') s = '-1';
    
    const parts = s.split('/');
    let val = 0;
    if (parts.length === 2) val = parseFloat(parts[0]) / parseFloat(parts[1]);
    else val = parseFloat(s);
    
    return { val, hasI };
  };

  signMatch.forEach(part => {
    const { val, hasI } = parsePart(part);
    if (hasI) im += val;
    else re += val;
  });
  
  return { re, im };
}

type StoreState = {
  coefficients: Complex[];
  roots: Complex[];
  isRootsMode: boolean;
  fractionDepth: number;
};

let state: StoreState = {
  coefficients: [
    { re: -1, im: 0 },
    { re: 0, im: 0 },
    { re: 0, im: 0 },
    { re: 1, im: 0 },
  ],
  roots: [
    { re: 1, im: 0 },
    { re: -0.5, im: 0.866025 },
    { re: -0.5, im: -0.866025 },
  ],
  isRootsMode: false,
  fractionDepth: 2, // Changed default to 2
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function rootsToCoeffs(roots: Complex[], leadingCoeff: Complex): Complex[] {
  let coeffs = [leadingCoeff];
  for (const r of roots) {
    const nextCoeffs: Complex[] = Array(coeffs.length + 1).fill({ re: 0, im: 0 });
    for (let i = 0; i < coeffs.length; i++) {
      nextCoeffs[i + 1] = cAdd(nextCoeffs[i + 1], coeffs[i]);
      nextCoeffs[i] = cSub(nextCoeffs[i], cMul(coeffs[i], r));
    }
    coeffs = nextCoeffs;
  }
  return coeffs.reverse(); // [c0, c1, ..., cn]
}

export function evaluatePolynomial(coeffs: Complex[], z: Complex): Complex {
  let result = { re: 0, im: 0 };
  let z_pow = { re: 1, im: 0 };
  for (const c of coeffs) {
    result = cAdd(result, cMul(c, z_pow));
    z_pow = cMul(z_pow, z);
  }
  return result;
}

export function evaluateDerivative(coeffs: Complex[], z: Complex): Complex {
  let result = { re: 0, im: 0 };
  let z_pow = { re: 1, im: 0 };
  for (let i = 1; i < coeffs.length; i++) {
    const term = cMul({ re: i, im: 0 }, coeffs[i]);
    result = cAdd(result, cMul(term, z_pow));
    z_pow = cMul(z_pow, z);
  }
  return result;
}

export function coeffsToRoots(coeffs: Complex[]): Complex[] {
  const n = coeffs.length - 1;
  if (n <= 0) return [];
  const leading = coeffs[n];
  const p = (z: Complex) => evaluatePolynomial(coeffs, z);
  
  let roots: Complex[] = [];
  const radius = 2.0; 
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n + 0.1;
    roots.push({ re: Math.cos(angle) * radius, im: Math.sin(angle) * radius });
  }

  const maxIter = 100;
  for (let iter = 0; iter < maxIter; iter++) {
    let maxError = 0;
    const nextRoots = [...roots];
    for (let i = 0; i < n; i++) {
      let denom = { re: 1, im: 0 };
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          denom = cMul(denom, cSub(roots[i], roots[j]));
        }
      }
      denom = cMul(denom, leading);
      if (denom.re === 0 && denom.im === 0) continue; // avoid div 0
      const diff = cDiv(p(roots[i]), denom);
      nextRoots[i] = cSub(roots[i], diff);
      maxError = Math.max(maxError, cAbs(diff));
    }
    roots = nextRoots;
    if (maxError < 1e-6) break;
  }
  return roots;
}

export function getCoefficients() {
  return state.coefficients;
}

export function setCoefficients(newCoeffs: Complex[]) {
  const roots = coeffsToRoots(newCoeffs);
  state = { ...state, coefficients: newCoeffs, roots };
  notify();
}

export function setRoots(newRoots: Complex[]) {
  let leading = state.coefficients[state.coefficients.length - 1];
  if (!leading || (leading.re === 0 && leading.im === 0)) leading = {re: 1, im: 0};
  const coeffs = rootsToCoeffs(newRoots, leading);
  state = { ...state, roots: newRoots, coefficients: coeffs };
  notify();
}

export function updateCoefficient(index: number, val: Complex) {
  if (index >= 0 && index < state.coefficients.length) {
    const newC = [...state.coefficients];
    newC[index] = val;
    setCoefficients(newC);
  }
}

export function updateRoot(index: number, val: Complex) {
  if (index >= 0 && index < state.roots.length) {
    const newR = [...state.roots];
    newR[index] = val;
    setRoots(newR);
  }
}

export function addRoot(val: Complex) {
  const newR = [...state.roots, val];
  setRoots(newR);
}

export function removeRoot(index: number) {
  if (state.roots.length > 0 && index >= 0 && index < state.roots.length) {
    const newR = [...state.roots];
    newR.splice(index, 1);
    setRoots(newR);
  }
}

export function addCoefficient(val: Complex) {
  const newC = [...state.coefficients, val];
  setCoefficients(newC);
}

export function removeCoefficient(index: number) {
  if (state.coefficients.length > 1 && index >= 0 && index < state.coefficients.length) {
    const newC = [...state.coefficients];
    newC.splice(index, 1);
    setCoefficients(newC);
  }
}

export function setIsRootsMode(isRootsMode: boolean) {
  state = { ...state, isRootsMode };
  notify();
}

export function setFractionDepth(depth: number) {
  state = { ...state, fractionDepth: depth };
  notify();
}

export function useStore() {
  const [s, setS] = useState(state);
  useEffect(() => {
    const listener = () => setS(state);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return s;
}

export function usePolynomial() {
  return useStore().coefficients;
}
