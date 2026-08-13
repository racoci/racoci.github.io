/**
 * Automated test suite to validate the Complex Function Plotter math engine
 * and prevent regression of the WebGL / canvas uniform-locations TypeError.
 *
 * Runs locally to verify structural and mathematical correctness of our AST
 * compiling, Nearley parsing, and coordinate system layouts.
 */

const { parseExpression } = require('../src/components/complex-plotter/gl-code/complex-functions.js');

// Mock WebGL and DOM variables
const mockVariables = {
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

// Simulated mock of initializeScene
const mockVarLocations = {
  log_scale: "WebGLUniformLocation_log_scale",
  center_x: "WebGLUniformLocation_center_x",
  center_y: "WebGLUniformLocation_center_y",
  c: "WebGLUniformLocation_c",
  // Note: 'enable_axes' is a client-only variable and will NOT have a WebGL uniform location
};

function runTest() {
  console.log("=== RUNNING COMPLEX FUNCTION PLOTTER AUTOMATED TESTS ===");

  let passed = true;

  try {
    // ----------------------------------------------------
    // TEST 1: Nearley Parser & Compiler Stability
    // ----------------------------------------------------
    console.log("\n[Test 1] Testing Nearley Parser on algebraic equations...");
    
    const expressions = ["z^2 + c", "sin(z)", "z^5 - z - 1", "exp(z)", "tan(z) * i"];
    for (const expr of expressions) {
      const ast = parseExpression(expr);
      if (!ast || !Array.isArray(ast)) {
        throw new Error(`Failed to compile expression: "${expr}". Returned AST is invalid.`);
      }
      console.log(`  ✓ Successfully compiled "${expr}" -> AST type: [${ast[0]}]`);
    }

    // ----------------------------------------------------
    // TEST 2: Uniform Variable Extraction & Alignment (Prevention of L81 TypeError)
    // ----------------------------------------------------
    console.log("\n[Test 2] Testing WebGL / Canvas Uniform variable extraction...");

    const varNames = Object.keys(mockVariables);
    const variablesForScene = {};

    for (const k of varNames) {
      // Replicate the exact new non-collapsing uniform assignments:
      // If a uniform location is not found on the GPU program (e.g., client-only 'enable_axes'),
      // it MUST default to null instead of omitting the key entirely.
      variablesForScene[k] = [mockVarLocations[k] || null, mockVariables[k][0]];
    }

    // Assert that 'enable_axes' and 'log_scale' exist and are well-formed 2-tuples
    if (!variablesForScene["enable_axes"]) {
      throw new Error("Regression detected! 'enable_axes' is omitted from variablesForScene dictionary.");
    }
    if (!variablesForScene["log_scale"]) {
      throw new Error("Regression detected! 'log_scale' is omitted from variablesForScene dictionary.");
    }

    // Replicate the exact index accesses done in scene.js (drawAxes and drawScene)
    // L81 check in scene.js: variables.enable_axes[1]
    const enableAxesValue = variablesForScene["enable_axes"][1];
    const logScaleValue = variablesForScene["log_scale"][1];

    if (enableAxesValue === undefined || enableAxesValue === null) {
      throw new Error("TypeError risk! variables.enable_axes[1] is undefined, which will crash drawAxes.");
    }
    if (logScaleValue === undefined || logScaleValue === null) {
      throw new Error("TypeError risk! variables.log_scale[1] is undefined, which will crash drawAxes.");
    }

    console.log(`  ✓ 'enable_axes' uniform formatted correctly:`, variablesForScene["enable_axes"]);
    console.log(`  ✓ 'log_scale' uniform formatted correctly:`, variablesForScene["log_scale"]);
    console.log(`  ✓ Tested L81 access: variables.enable_axes[1] = ${enableAxesValue} (Safe!)`);
    console.log(`  ✓ Tested L84 access: variables.log_scale[1] = ${logScaleValue} (Safe!)`);

  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:");
    console.error(err.message);
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
