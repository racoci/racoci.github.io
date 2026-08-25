# Implementation Plan: Epic 2: Component Inspector

This document details the step-by-step technical plan to implement **Epic 2: Component Inspector** in the CMS Workspace.

---

## 🏗️ Architectural Risks & Future Mitigations
- **Risk 1: Dynamic Component Remounting Performance Lag**
  - *Detail:* Re-mounting heavy components (SVG and WebGL canvas components) via dynamic stringified keys may cause brief jank or lag when sliding sliders rapidly.
  - *Future Mitigation:* Implement a debounced state update inside the Inspector panel so that slider movements only update local Inspector state instantly but wait 100ms before committing the serialized XML back to the CMS workspace state, preserving high performance.
- **Risk 2: Invalid JSON inputs in code-styling fields**
  - *Detail:* Syntactically incorrect arrays/JSON strings entered into the Triple or array field of `BarningHallTreeVisualizer` will cause `JSON.parse` to crash.
  - *Future Mitigation:* Wrap the parser inside a strict `try/catch` block. If parsing fails, preserve the user's active cursor/text input state but display a visual warning, ignoring the crash-prone value until it becomes syntactically valid JSON.

---

## 🚀 Phases and Tasks

### Phase 1: Preparation & Planning
- [x] Task: Project Context & Planning Verification
  - *Action:* Validate that the environment, styles, and tech stack are stable.
  - *Documentation:* `documentation/planning/epic-2-component-inspector_20261112_spec.md`
  - *Verification/Test:* None (planning check).
- [x] Task: Recursive Risk Analysis
  - *Action:* Execute a deep recursive risk analysis for the proposed architecture using the `recursive-risk-analyzer` skill.
  - *Documentation:* Append the risk findings to the bottom of `plan.md`.
  - *Verification/Test:* Self-correcting risk tree validated.

### Phase 2: Core State & Utility Functions
- [x] Task: Define Metadata & Parsing Utilities
  - *Action:* Declare the constant `WIDGET_METADATA` and the helper functions `parseWidgetProps` and `serializeWidget`. Update `parseMDXContent`'s regex to support parameters.
  - *Documentation:* In-code JSDoc annotations and dedicated section in `documentation/planning/authoring-ide-epics.md`.
  - *Verification/Test:* Create a local validation script `/home/racoci/Projects/portifolio/scripts/test_inspector_utils.ts` and run it via TS compiler to assert that `parseWidgetProps` and `serializeWidget` work correctly for all three visualizers.

### Phase 3: Block Interaction and Selection Overhaul
- [x] Task: Intercept WYSIWYG Interaction & Highlight Selected Blocks
  - *Action:* Modify the block mapping loop in both single-pane and dual-pane views in `src/app/[lang]/workspace/page.tsx` to detect interactive widgets using `WIDGET_SUGGESTIONS`. If detected, clicks should set `setInspectedBlockIdx(blockIdx)` and add an emerald border style instead of launching raw editors.
  - *Documentation:* Section in `documentation/planning/authoring-ide-epics.md`.
  - *Verification/Test:* Run `npm run build` to verify syntax and type correctness.

### Phase 4: Dynamic Inspector Panel
- [x] Task: Implement Interactive Inspector Panel
  - *Action:* Render the floating/right-aligned fixed Inspector sidebar when `inspectedBlockIdx !== null`. Present inputs based on `WIDGET_METADATA` and synchronize changes with the workspace block array in real-time. Render the "Close" and "Edit Raw XML" actions.
  - *Documentation:* Section in `documentation/planning/authoring-ide-epics.md`.
  - *Verification/Test:* Run a full static analysis check and `npm run build`.

### Phase 5: Final Validation & Checkpoint
- [x] Task: Build Validation & Checkpoint
  - *Action:* Verify complete project compilation with zero TypeScript errors or ESLint warnings.
  - *Documentation:* This plan and `authoring-ide-epics.md`.
  - *Verification/Test:* Execute `npm run build` as the final pass-to-complete gate.

---

## 🌲 Recursive Risk & Mitigation Analysis (6-Level Deep Tree)

This section maps potential engineering pitfalls, cascade failures, and mitigation loops for the Component Inspector design.

### Branch A: State Synchronization & Performance
- **Level 1 (Initial Risk):** React Component Re-mounting causes UI stutter or lag when sliding sliders rapidly (e.g. adjusting `target` or `initialM`).
  - **Mitigation 1:** Implement debounced state propagation (50ms) for continuous slider adjustments, separating local state from global block updates.
- **Level 2 (Secondary Risk):** Debouncing state synchronization introduces a race condition where the user saves, tab-switches, or publishes while a debounced change is pending.
  - **Mitigation 2:** Create a synchronous "flush" mechanism that forces any pending debounced change to commit immediately on unmount, tab change, blur, or publish trigger.
- **Level 3 (Tertiary Risk):** Synchronous flushing can block the main React execution thread if the text-serialization operations are computationally expensive.
  - **Mitigation 3:** Keep string parsing and regex operations highly optimal and linear ($O(N)$ where $N$ is block size), avoiding heavy AST parsing during active typing.
- **Level 4 (Quaternary Risk):** Text serialization of non-primitive types (e.g., custom arrays or JSON) can easily generate malformed JSX/XML, corrupting MDX files and crashing the main rendering.
  - **Mitigation 4:** Use strict try-catch schemas when processing JSON inputs (like `initialTriple`). Disable serialization of the field and show red inline error warnings if the typed JSON is syntactically invalid.
- **Level 5 (Quinary Risk):** Disabling serialization on invalid inputs means unsaved visual progress is lost if the user switches to the raw text editor ("Edit Raw XML") or reloads.
  - **Mitigation 5:** Store the user's literal draft string in a temporary scratchpad. When switching to raw XML editing, initialize the raw block textarea with this draft state, preserving user intent.
- **Level 6 (Senary Risk):** Multiplying local scratchpads and global editor state triggers sync drifts (e.g., when clicking undo/redo in the main editor).
  - **Mitigation 6 (Residual Risk: Low):** Anchor the Inspector state strictly to the parent block index, and use a standard unidirectional synchronization effect that triggers whenever the block index or the parent block content changes externally. All residual risks on this branch are classified as **Low Likelihood**.
