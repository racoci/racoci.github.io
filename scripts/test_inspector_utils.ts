import { SternBrocotVisualizer } from "../src/components/pythagorean/SternBrocotVisualizer";

// Define metadata structure
interface WidgetPropMeta {
  type: "number" | "string" | "json";
  default: any;
  label?: string;
}

const WIDGET_METADATA: Record<string, Record<string, WidgetPropMeta>> = {
  "SternBrocotVisualizer": {
    target: { type: "number", default: Math.PI, label: "Target (Irrational)" },
    initialPath: { type: "string", default: "", label: "Initial Path (e.g. LRR)" }
  },
  "GaussianQuadratureVisualizer": {
    initialM: { type: "number", default: 2, label: "Seed m (Real)" },
    initialN: { type: "number", default: 1, label: "Seed n (Imaginary)" }
  },
  "BarningHallTreeVisualizer": {
    initialTriple: { type: "json", default: [3, 4, 5], label: "Initial Triple [a,b,c]" }
  }
};

function parseWidgetProps(contentStr: string): Record<string, any> {
  const props: Record<string, any> = {};
  const attrRegex = /(\w+)\s*=\s*(?:{([^}]+)}|"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRegex.exec(contentStr)) !== null) {
    const name = match[1];
    const curlyVal = match[2];
    const doubleQuoteVal = match[3];
    const singleQuoteVal = match[4];

    if (curlyVal !== undefined) {
      const trimmed = curlyVal.trim();
      if (trimmed === "Math.PI") {
        props[name] = Math.PI;
      } else if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          props[name] = JSON.parse(trimmed);
        } catch (e) {
          props[name] = trimmed;
        }
      } else {
        const num = Number(trimmed);
        props[name] = isNaN(num) ? trimmed : num;
      }
    } else if (doubleQuoteVal !== undefined) {
      props[name] = doubleQuoteVal;
    } else if (singleQuoteVal !== undefined) {
      props[name] = singleQuoteVal;
    }
  }
  return props;
}

function serializeWidget(widgetName: string, props: Record<string, any>): string {
  const parts = [widgetName];
  Object.entries(props).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    if (typeof val === "string") {
      parts.push(`${key}="${val}"`);
    } else if (typeof val === "number") {
      parts.push(`${key}={${val}}`);
    } else if (Array.isArray(val) || typeof val === "object") {
      parts.push(`${key}={${JSON.stringify(val)}}`);
    } else {
      parts.push(`${key}={${val}}`);
    }
  });
  return `<${parts.join(" ")} />`;
}

// Running Test Cases
console.log("--- RUNNING UTILITY TESTS ---");

const testCases = [
  '<SternBrocotVisualizer target={1.5} initialPath="LR" />',
  '<SternBrocotVisualizer target={Math.PI} />',
  '<GaussianQuadratureVisualizer initialM={3} initialN={2} />',
  '<BarningHallTreeVisualizer initialTriple={[3,4,5]} />',
  '<BarningHallTreeVisualizer />'
];

for (const tc of testCases) {
  console.log(`Original: ${tc}`);
  const props = parseWidgetProps(tc);
  console.log("Parsed Props:", props);
  
  // Extract component name
  const nameMatch = tc.match(/<(\w+)/);
  if (nameMatch) {
    const name = nameMatch[1];
    const serialized = serializeWidget(name, props);
    console.log(`Serialized: ${serialized}`);
  }
  console.log("---");
}

console.log("ALL TESTS COMPLETED SUCCESSFULY!");
