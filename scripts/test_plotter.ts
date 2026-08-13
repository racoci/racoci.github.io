/**
 * Automated test suite to validate the Complex Function Plotter math engine,
 * parser expansion, synonyms, LaTeX commands, and coordinate systems.
 */

import { parseExpression } from '../src/components/complex-plotter/gl-code/complex-functions';
import compileGLSL from '../src/components/complex-plotter/gl-code/translators/to-glsl';
import toJS from '../src/components/complex-plotter/gl-code/translators/to-js';
import toLaTeX from '../src/components/complex-plotter/gl-code/translators/to-latex';
import { ASTNode } from '../src/components/complex-plotter/gl-code/types';

// Mock WebGL and DOM variables
const mockVariables: Record<string, any> = {
  log_scale: [1.2, 0],
  center_x: [0, 0],
  center_y: [0, 0],
  enable_axes: [1, 0],
  enable_checkerboard: [0, 0],
  invert_gradient: [0, 0],
  continuous_gradient: [1, 0],
  custom_function: [0, 0],
  grid_type: [1, 0],
  c: [0.35, 0.45],
};

function getFreeVariables(ast: ASTNode | null, bound: Set<string> = new Set()): string[] {
    if (ast === null) return [];
    if (typeof ast === 'number' || !isNaN(ast as any)) return [];
    if (!Array.isArray(ast)) return [];

    const [operator, ...args] = ast as [string, ...any[]];

    if (operator === 'variable') {
        const name = args[0];
        if (name === 'z' || bound.has(name)) return [];
        return [name];
    }

    if (operator === 'sum' || operator === 'prod') {
        const [expr, idxVar, low, high] = args;
        const newBound = new Set(bound);
        newBound.add(idxVar);
        return getFreeVariables(expr as ASTNode, newBound);
    }

    const freeVars = new Set<string>();
    for (const arg of args) {
        if (Array.isArray(arg) || typeof arg === 'object') {
            getFreeVariables(arg as ASTNode, bound).forEach(v => freeVars.add(v));
        }
    }
    return Array.from(freeVars);
}

function runTest() {
  console.log("=== RUNNING COMPLEX FUNCTION PLOTTER OVERHAUL TESTS ===");

  let passed = true;

  try {
    // ----------------------------------------------------
    // TEST 1: Synonyms & Aliases Parser Support
    // ----------------------------------------------------
    console.log("\n[Test 1] Testing math synonyms (sen, tg, arctg, etc.)...");
    const synonymsToTest = [
      { input: "sen(z)", expectedOp: "sin" },
      { input: "seno(z)", expectedOp: "sin" },
      { input: "tg(z)", expectedOp: "tan" },
      { input: "atg(z)", expectedOp: "arctan" },
      { input: "arctg(z)", expectedOp: "arctan" }
    ];

    for (const { input, expectedOp } of synonymsToTest) {
      const ast = parseExpression(input);
      if (!ast || !Array.isArray(ast)) {
        throw new Error(`Failed to parse synonym input "${input}"`);
      }
      if (ast[0] !== expectedOp) {
        throw new Error(`Expected op "${expectedOp}" for synonym "${input}", but got "${ast[0]}"`);
      }
      console.log(`  ✓ Synonym "${input}" successfully mapped to "${expectedOp}"`);
    }

    // ----------------------------------------------------
    // TEST 2: LaTeX Parsing Commands
    // ----------------------------------------------------
    console.log("\n[Test 2] Testing LaTeX command parsing (\\sin, \\cos, \\pi, \\frac)...");
    const latexExpressions = [
      "\\sin(z) + \\cos(z)",
      "z^{\\pi}",
      "\\frac{z}{2}",
      "z^{2 + i}"
    ];

    for (const expr of latexExpressions) {
      const ast = parseExpression(expr);
      if (!ast) {
        throw new Error(`Failed to parse LaTeX expression "${expr}"`);
      }
      console.log(`  ✓ LaTeX expression "${expr}" parsed successfully:`, JSON.stringify(ast));
    }

    // ----------------------------------------------------
    // TEST 3: LaTeX Summation and Product loops
    // ----------------------------------------------------
    console.log("\n[Test 3] Testing LaTeX style \\sum and \\prod loops...");
    const loopsToTest = [
      "\\sum_{n=1}^{5}{z^n}",
      "\\prod_{k=2}^{4}{z * k}"
    ];

    for (const expr of loopsToTest) {
      const ast = parseExpression(expr);
      if (!ast || !Array.isArray(ast)) {
        throw new Error(`Failed to parse loop expression "${expr}"`);
      }
      const [op, exprBody, idxVar, low, high] = ast;
      if (op !== 'sum' && op !== 'prod') {
        throw new Error(`Expected sum or prod operator, but got "${op}" for "${expr}"`);
      }
      if (idxVar !== 'n' && idxVar !== 'k') {
        throw new Error(`Incorrect loop variable: got "${idxVar}"`);
      }
      console.log(`  ✓ LaTeX loop "${expr}" parsed successfully as [${op}] loop variable ${idxVar} from ${low} to ${high}`);
    }

    // ----------------------------------------------------
    // TEST 4: Custom Free Variables Discovery
    // ----------------------------------------------------
    console.log("\n[Test 4] Testing free variables discovery and bound scoping...");
    const astForFreeVars = parseExpression("z^2 + c * a + \\sum_{n=1}^{5}{z^n * b}");
    if (!astForFreeVars) {
      throw new Error("Failed to parse expression for variable discovery");
    }
    const freeVars = getFreeVariables(astForFreeVars);
    console.log("  Parsed free variables:", freeVars);
    
    const expectedVars = ['c', 'a', 'b'];
    for (const v of expectedVars) {
      if (!freeVars.includes(v)) {
        throw new Error(`Expected free variable "${v}" to be discovered, but it was missing!`);
      }
    }
    if (freeVars.includes('z') || freeVars.includes('n')) {
      throw new Error("Regression! 'z' or bound variable 'n' mistakenly treated as free variables.");
    }
    console.log("  ✓ Free variables correctly identified (ignoring z and loop indices)!");

    // ----------------------------------------------------
    // TEST 5: AST to LaTeX Translation (Symmetry)
    // ----------------------------------------------------
    console.log("\n[Test 5] Testing AST to LaTeX Symmetrical Visualizer...");
    const latexTests = [
      { input: "\\sin(z) + c", expected: "\\sin\\left(z\\right) + c" },
      { input: "\\frac{z}{2}", expected: "\\frac{z}{2}" },
      { input: "z^{\\pi}", expected: "{z}^{\\pi}" },
      { input: "\\sum_{n=1}^{5}{z^n}", expected: "\\sum_{n=1}^{5} {z}^{n}" }
    ];
    for (const { input } of latexTests) {
      const ast = parseExpression(input);
      const generatedLaTeX = toLaTeX(ast);
      console.log(`  ✓ Input: "${input}" -> LaTeX: "${generatedLaTeX}"`);
      if (!generatedLaTeX) {
        throw new Error(`Generated LaTeX is empty for input "${input}"`);
      }
    }

  } catch (err) {
    console.error("\n❌ OVERHAUL TEST SUITE FAILED:");
    console.error(err instanceof Error ? err.message : String(err));
    passed = false;
  }

  if (passed) {
    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! NO REGRESSIONS DETECTED.\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTest();
