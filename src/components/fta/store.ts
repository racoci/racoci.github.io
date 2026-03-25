import { useState, useEffect } from 'react';

export type Complex = { re: number; im: number };

let coefficients: Complex[] = [
  { re: -1, im: 0 }, // c0
  { re: 0, im: 0 },  // c1
  { re: 0, im: 0 },  // c2
  { re: 1, im: 0 },  // c3
];

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setCoefficients(newCoefficients: Complex[]) {
  coefficients = newCoefficients;
  notify();
}

export function updateCoefficient(index: number, value: Complex) {
  if (index >= 0 && index < coefficients.length) {
    coefficients[index] = value;
    notify();
  }
}

export function getCoefficients() {
  return coefficients;
}

export function usePolynomial() {
  const [coeffs, setCoeffsState] = useState(coefficients);

  useEffect(() => {
    const listener = () => setCoeffsState([...coefficients]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return coeffs;
}

export function evaluatePolynomial(coeffs: Complex[], z: Complex): Complex {
  let result = { re: 0, im: 0 };
  let z_pow = { re: 1, im: 0 };
  
  for (const c of coeffs) {
    result.re += c.re * z_pow.re - c.im * z_pow.im;
    result.im += c.re * z_pow.im + c.im * z_pow.re;
    
    const next_re = z_pow.re * z.re - z_pow.im * z.im;
    const next_im = z_pow.re * z.im + z_pow.im * z.re;
    z_pow = { re: next_re, im: next_im };
  }
  return result;
}
