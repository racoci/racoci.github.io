import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert';

const colorRules: Record<string, string> = {
  // Polynomial (Green)
  'P': '#10b981',
  
  // Leading Term & Associated (Blue)
  'L': '#3b82f6', 
  'c_d': '#3b82f6', 
  'd': '#3b82f6', 
  'i': '#3b82f6',

  // Error Term & Lower Coeffs (Rose)
  'E': '#f43f5e', 
  'c_k': '#f43f5e', 
  'c_0': '#f43f5e', 
  'c_{d-1}': '#f43f5e',

  // Variables, Domain, Iterators (Amber)
  'z': '#fbbf24', 'z_n': '#fbbf24', 'z_m': '#fbbf24',
  'R': '#fbbf24', 
  'w': '#fbbf24', 'w_1': '#fbbf24', 'w_2': '#fbbf24', 'w_k': '#fbbf24', 'w_j': '#fbbf24',
  'u': '#fbbf24', 'v': '#fbbf24',
  'a': '#fbbf24', 'a_1': '#fbbf24', 'a_2': '#fbbf24',
  'b': '#fbbf24', 'b_1': '#fbbf24', 'b_2': '#fbbf24',
  'U': '#fbbf24', 'U_P': '#fbbf24', 'U_L': '#fbbf24',
  '\\Delta_P': '#fbbf24', '\\Delta_L': '#fbbf24', '\\Delta': '#fbbf24',

  // Operators / Functions (Purple)
  'N': '#a855f7'
};

const vars = Object.keys(colorRules).sort((a, b) => b.length - a.length);
const varsPattern = vars.map(v => v.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}')).join('|');
const varRegex = new RegExp(`^(${varsPattern})(?![a-zA-Z])`);

export function colorizeMath(tex: string): string {
  // 1. Clean existing manual colors completely
  tex = tex.replace(/\\textcolor\{#[a-fA-F0-9]+\}\{([^}]+)\}/g, '$1');
  tex = tex.replace(/\\color\{#[a-fA-F0-9]+\}\{([^}]+)\}/g, '$1');
  tex = tex.replace(/\\color\{#[a-fA-F0-9]+\}\s*/g, '');

  let out = "";
  let i = 0;
  while (i < tex.length) {
    // Protected blocks
    const protectedMatch = tex.slice(i).match(/^\\(mathbb|text|mathrm|mathbf)\{[^}]+\}/);
    if (protectedMatch) {
      out += protectedMatch[0];
      i += protectedMatch[0].length;
      continue;
    }

    // Variables matching
    const varMatch = tex.slice(i).match(varRegex);
    if (varMatch) {
      const v = varMatch[0];
      const color = colorRules[v];
      if (color) {
        out += `\\textcolor{${color}}{${v}}`;
      } else {
        out += v;
      }
      i += v.length;
      continue;
    }

    // LaTeX Commands
    const cmdMatch = tex.slice(i).match(/^\\[a-zA-Z]+/);
    if (cmdMatch) {
      out += cmdMatch[0];
      i += cmdMatch[0].length;
      continue;
    }

    out += tex[i];
    i++;
  }
  return out;
}

export function processMarkdown(md: string): string {
  let out = md.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    return `$$\n${colorizeMath(tex.trim())}\n$$`;
  });
  
  out = out.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (match, tex) => {
    return `$${colorizeMath(tex.trim())}$`;
  });
  
  return out;
}

async function runTests() {
  console.log("Running Unit Tests...");
  
  test('Cleans existing \\color directives', () => {
    assert.strictEqual(colorizeMath('\\color{#10b981}{P}(z)'), '\\textcolor{#10b981}{P}(\\textcolor{#fbbf24}{z})');
    assert.strictEqual(colorizeMath('\\color{#10b981} P(z)'), '\\textcolor{#10b981}{P}(\\textcolor{#fbbf24}{z})');
  });

  test('Delimiters and Operators remain neutral', () => {
    assert.strictEqual(
      colorizeMath('P(z) = L(z) + E(z)'),
      '\\textcolor{#10b981}{P}(\\textcolor{#fbbf24}{z}) = \\textcolor{#3b82f6}{L}(\\textcolor{#fbbf24}{z}) + \\textcolor{#f43f5e}{E}(\\textcolor{#fbbf24}{z})'
    );
    assert.strictEqual(
      colorizeMath('\\langle w_1, w_2 \\rangle'),
      '\\langle \\textcolor{#fbbf24}{w_1}, \\textcolor{#fbbf24}{w_2} \\rangle'
    );
  });

  test('Subscript priority matches correctly', () => {
    assert.strictEqual(
      colorizeMath('c_{d-1} z^{d-1}'),
      '\\textcolor{#f43f5e}{c_{d-1}} \\textcolor{#fbbf24}{z}^{\\textcolor{#3b82f6}{d}-1}'
    );
  });

  test('Bypasses protected LaTeX blocks', () => {
    assert.strictEqual(
      colorizeMath('\\mathbb{Q}(i)'),
      '\\mathbb{Q}(\\textcolor{#3b82f6}{i})'
    );
    assert.strictEqual(
      colorizeMath('\\text{Re}(w_1)'),
      '\\text{Re}(\\textcolor{#fbbf24}{w_1})'
    );
  });
}

function processFiles() {
  const files = [
    path.resolve(__dirname, '../src/content/essays/fta/pt.mdx'),
    path.resolve(__dirname, '../src/content/essays/fta/en.mdx')
  ];

  files.forEach(file => {
    console.log(`Processing ${file}...`);
    const content = fs.readFileSync(file, 'utf-8');
    const updated = processMarkdown(content);
    fs.writeFileSync(file, updated, 'utf-8');
    console.log(`✅ Updated ${path.basename(file)}`);
  });
}

// Run sequence
runTests().then(() => {
  processFiles();
  console.log("All tasks complete!");
});
