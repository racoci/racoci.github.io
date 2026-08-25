# Specification: Epic 2: Component Inspector

## 1. Overview
The CMS Workspace currently allows drafting and viewing complex mathematical and topological visualizers (e.g. `SternBrocotVisualizer`, `GaussianQuadratureVisualizer`, `BarningHallTreeVisualizer`) as embedded React components using custom MDX tags. However, editing their parameters requires manual XML/MDX markup changes in raw text blocks.

This feature implements **Epic 2: Component Inspector (Visual Props Editor)**. Fusing interactive widgets with visual form configurations, it enables authors to click on any reactive widget inside the WYSIWYG block render loop to open a visual properties inspector. The inspector parses the widget's existing properties, presents clean form inputs based on defined metadata schemas, updates the raw block text reactively on any input, and supports seamless transitions between visual inspection and raw XML editing.

## 2. Functional Requirements
1. **Widget Metadata Registry:**
   - Define a static registry `WIDGET_METADATA` describing editable props, types (number, string, json), defaults, and visual labels for:
     - `SternBrocotVisualizer` (props: `target` as number, `initialPath` as string)
     - `GaussianQuadratureVisualizer` (props: `initialM` as number, `initialN` as number)
     - `BarningHallTreeVisualizer` (props: `initialTriple` as json)

2. **Component Inspector State & Parsing Utilities:**
   - Maintain state `inspectedBlockIdx` tracking the block index currently selected for visual inspection.
   - Create a regex-based parser `parseWidgetProps` to extract prop name-value pairs from MDX widget strings (e.g., `<SternBrocotVisualizer target={1.5} initialPath="LR" />`). Support props formatted as `prop={value}`, `prop="value"`, or `prop={[array]}`.
   - Create a serializer `serializeWidget` to convert a widget name and active prop values back into a valid self-closing JSX string.

3. **WYSIWYG Interaction & Selection Overhaul:**
   - During block iteration (`editorText.split("\n\n").map(...)`), check if a block is a registered interactive widget (by matching `WIDGET_SUGGESTIONS`).
   - If it is a widget block, clicking it must **no longer** open the raw `AutosizingBlockTextarea`. Instead, it sets `inspectedBlockIdx(blockIdx)` and selects the block.
   - The selected block renders with a visual highlight (e.g., a stylish green emerald border, padding, and subtle shadow) indicating it is selected for inspection.

4. **Interactive Floating Inspector Panel:**
   - If a block is currently selected for inspection (`inspectedBlockIdx !== null`), render a fixed or floating Inspector panel (typically on the right-hand side or as a persistent sidebar card).
   - Display the active widget's name and present clean input fields (sliders or text inputs for numbers, text inputs for strings, code-styled text areas for JSON structures) matching `WIDGET_METADATA`.
   - Pre-fill inputs with currently parsed values from the block string, falling back to schema defaults.
   - On change of any field, reconstruct the widget tag string using `serializeWidget`, instantly trigger `handleBlockChange(inspectedBlockIdx, newVal)` to sync the workspace state, and re-render the live widget.
   - Provide a "Close" (`X`) button to clear `inspectedBlockIdx(null)`.
   - Provide an "Edit Raw XML" button that falls back to standard text editing by clearing `inspectedBlockIdx(null)` and setting `editingBlockIndex(inspectedBlockIdx)`.

## 3. Non-Functional Requirements
- **Symmetrical Dynamic Key Rendering:**
  - In `BlockContentRenderer`, when rendering interactive widgets, parse their props and pass them dynamically using the spread operator (`{...props}`).
  - Add a dynamic key `key={JSON.stringify(props)}` to force-mount/re-create the visualizer whenever its properties are adjusted, ensuring instantaneous visual feedback.
- **Strict Compilation & Typings:**
  - Build compilation must succeed with zero TypeScript or ESLint errors.

## 4. Acceptance Criteria
- [ ] Static metadata registry `WIDGET_METADATA` defined.
- [ ] Parse and serialize utilities successfully handle different prop data types (numbers, strings, arrays/JSON).
- [ ] Clicking widget blocks selects them for inspection, bypassing raw textarea activation.
- [ ] Selected widget block displays a high-contrast emerald border.
- [ ] Fixed or floating Inspector panel renders when `inspectedBlockIdx !== null`.
- [ ] Inspector inputs are pre-filled with parsed block values or schema defaults.
- [ ] Modifying an Inspector input instantly updates the editor's raw state and updates the preview.
- [ ] Close button and Edit Raw XML options transition state correctly.
- [ ] Compilation succeeds with `npm run build` with zero warnings or errors.
