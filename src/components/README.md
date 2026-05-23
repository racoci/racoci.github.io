# Portfolio Interactive Components Core

This folder contains high-performance, responsive, zero-dependency visual components built with React, Tailwind CSS, SVG, HTML5 Canvas, and WebGL APIs.

## Directory Mapping & Architectures

Each subdirectory represents a complete, highly-specialized mathematical or computer science visualizer:

### 1. [Complex Function WebGL Plotter](./complex-plotter)
*   **Architecture:** Earley Nearley compiler pipeline with high-fidelity, hardware-accelerated fragment shader rendering (GLSL) at 60 FPS.
*   **Invariants:** Symmetrical GLSL and MathJS compilations from a single mathematical expression string to support WebGL viewport rendering and local hover tooltips synchronously.
*   **Key Features:** Anti-aliasing, 4-Rook Supersampling, coordinate axes drawing with Computer Modern serif fonts, and drag-and-zoom tracking.

### 2. [Fundamental Theorem of Algebra Visualizers](./fta)
*   **Architecture:** Zustand central state store implementing continuous numerical Durand-Kerner approximations and exact Viete sum-product polynomial expansions.
*   **Invariants:** Symmetrical 2-way sync (editing roots dynamically recalculates coefficients; editing coefficients simultaneously updates roots).
*   **Key Features:** Math-serif WYSIWYG editor with Continued Fractions snapping, Conformal mapping color-hue progressions, Rouché loop trace tracking, and an active Quadtree bisection radar simulation with scanlines.

### 3. [Sudoku Solver & Board Layout](./SudokuViewer.tsx)
*   **Architecture:** Backtracking search algorithm capped at 4000 steps to prevent browser tab lockups on contradictory, pathological, or complex inputs.
*   **Key Features:** Double-layer text-import editor with color-coded active values, auto-filtering sanitization on input keystrokes, and non-collapsing responsive board layout.

---

## Shared Engineering Guidelines

All interactive components in this directory adhere to strict software engineering and mathematical safety guidelines:

1.  **Asynchronous Guardrails:** Explicit execution timeouts and bounded retry limits are placed on all asynchronous or iterative processes to ensure immediate UI responsiveness.
2.  **No Unbounded Recursion:** Recursion is strictly capped to prevent stack overflows and thread blocks.
3.  **Strict Type Safety:** Zero unsafe type casting is allowed, with strict type declarations (`types.ts` and standard TypeScript) configured.
4.  **No Hydration Mismatches:** Client-only layout renders (such as Dark Reader mutations or system color checks) are protected with mounted state guards (`useEffect` checks) to ensure standard SSR compatibility.
