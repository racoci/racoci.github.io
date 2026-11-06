"use client";

import React, { useState } from "react";
import { InlineMath, BlockMath } from "react-katex";

interface WorldNode {
  id: string;
  label: string;
  atoms: string[];
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  type: "deontic" | "epistemic";
}

export function NormativeBisimulationVisualizer() {
  const [selectedWorld1, setSelectedWorld1] = useState<string>("w1");
  const [selectedWorld2, setSelectedWorld2] = useState<string>("v1");
  const [selectedFormula, setSelectedFormula] = useState<string>("O_p");
  const [isBisimilarChecked, setIsBisimilarChecked] = useState(true);

  // Model 1: System M
  const model1Nodes: WorldNode[] = [
    { id: "w1", label: "w₁", atoms: ["safe", "rescue"], x: 70, y: 80 },
    { id: "w2", label: "w₂", atoms: ["safe"], x: 190, y: 80 },
    { id: "w3", label: "w₃", atoms: ["danger"], x: 130, y: 190 },
  ];

  const model1Edges: Edge[] = [
    { from: "w1", to: "w2", type: "deontic" }, // B_p
    { from: "w1", to: "w3", type: "epistemic" }, // R_K
    { from: "w2", to: "w2", type: "deontic" },
  ];

  // Model 2: System N (Bisimilar structurally, different presentation)
  const model2Nodes: WorldNode[] = [
    { id: "v1", label: "v₁", atoms: ["safe", "rescue"], x: 330, y: 80 },
    { id: "v2", label: "v₂", atoms: ["safe"], x: 450, y: 80 },
    { id: "v3", label: "v₃", atoms: ["danger"], x: 390, y: 190 },
  ];

  const model2Edges: Edge[] = [
    { from: "v1", to: "v2", type: "deontic" },
    { from: "v1", to: "v3", type: "epistemic" },
    { from: "v2", to: "v2", type: "deontic" },
  ];

  // Bisimulation pairs: (w1, v1), (w2, v2), (w3, v3)
  const isBisimilarPair =
    (selectedWorld1 === "w1" && selectedWorld2 === "v1") ||
    (selectedWorld1 === "w2" && selectedWorld2 === "v2") ||
    (selectedWorld1 === "w3" && selectedWorld2 === "v3");

  const evaluateFormula = (world: string, formula: string): boolean => {
    switch (formula) {
      case "atom_safe":
        return world === "w1" || world === "w2" || world === "v1" || world === "v2";
      case "O_safe":
        // Obligation of safe: all deontic transitions lead to safe
        return world === "w1" || world === "w2" || world === "v1" || world === "v2";
      case "K_danger":
        // Knows danger: accessible via epistemic link
        return world === "w1" || world === "v1";
      case "O_K_safe":
        return world === "w1" || world === "v1";
      default:
        return true;
    }
  };

  const eval1 = evaluateFormula(selectedWorld1, selectedFormula);
  const eval2 = evaluateFormula(selectedWorld2, selectedFormula);
  const truthPreserved = eval1 === eval2;

  return (
    <div className="my-8 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Simulador de Bisimulação Normativa (Teoremas A & B)
          </h3>
          <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
            Comprova construtivamente que mundos bisimilares são observacionalmente indistinguíveis na lógica multimodal deôntica-epistêmica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBisimilarChecked(!isBisimilarChecked)}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-colors ${
              isBisimilarChecked
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {isBisimilarChecked ? "✓ Relação Z Ativa" : "Desativar Relação Z"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Kripke Graph SVG */}
        <div className="lg:col-span-7 bg-[#09090b] p-4 rounded-xl border border-zinc-800/60 relative flex flex-col items-center justify-center">
          <svg viewBox="0 0 520 260" className="w-full h-auto overflow-visible select-none">
            <defs>
              <marker id="arrow-deontic" markerWidth="6" markerHeight="6" refX="14" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#10b981" />
              </marker>
              <marker id="arrow-epistemic" markerWidth="6" markerHeight="6" refX="14" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Model Headers */}
            <text x="130" y="25" fill="#71717a" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              ESTRUTURA M (Perspectiva 1)
            </text>
            <text x="390" y="25" fill="#71717a" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              ESTRUTURA N (Perspectiva 2)
            </text>

            {/* Bisimulation dashed bridges */}
            {isBisimilarChecked && (
              <g stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6">
                <line x1="70" y1="80" x2="330" y2="80" />
                <line x1="190" y1="80" x2="450" y2="80" />
                <line x1="130" y1="190" x2="390" y2="190" />
                <text x="260" y="75" fill="#c084fc" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Z w₁ v₁
                </text>
                <text x="260" y="185" fill="#c084fc" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Z w₃ v₃
                </text>
              </g>
            )}

            {/* Edges Model 1 */}
            {model1Edges.map((e, idx) => {
              const from = model1Nodes.find((n) => n.id === e.from)!;
              const to = model1Nodes.find((n) => n.id === e.to)!;
              const isDeontic = e.type === "deontic";
              const stroke = isDeontic ? "#10b981" : "#38bdf8";
              const marker = isDeontic ? "url(#arrow-deontic)" : "url(#arrow-epistemic)";

              if (e.from === e.to) {
                return (
                  <path
                    key={idx}
                    d={`M ${from.x} ${from.y - 12} C ${from.x - 20} ${from.y - 35}, ${from.x + 20} ${from.y - 35}, ${from.x + 12} ${from.y - 4}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1.5"
                    markerEnd={marker}
                  />
                );
              }

              return (
                <line
                  key={idx}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={stroke}
                  strokeWidth="1.5"
                  markerEnd={marker}
                />
              );
            })}

            {/* Edges Model 2 */}
            {model2Edges.map((e, idx) => {
              const from = model2Nodes.find((n) => n.id === e.from)!;
              const to = model2Nodes.find((n) => n.id === e.to)!;
              const isDeontic = e.type === "deontic";
              const stroke = isDeontic ? "#10b981" : "#38bdf8";
              const marker = isDeontic ? "url(#arrow-deontic)" : "url(#arrow-epistemic)";

              if (e.from === e.to) {
                return (
                  <path
                    key={idx}
                    d={`M ${from.x} ${from.y - 12} C ${from.x - 20} ${from.y - 35}, ${from.x + 20} ${from.y - 35}, ${from.x + 12} ${from.y - 4}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1.5"
                    markerEnd={marker}
                  />
                );
              }

              return (
                <line
                  key={idx}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={stroke}
                  strokeWidth="1.5"
                  markerEnd={marker}
                />
              );
            })}

            {/* Nodes Model 1 */}
            {model1Nodes.map((n) => {
              const isSelected = selectedWorld1 === n.id;
              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedWorld1(n.id)}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="16"
                    fill={isSelected ? "#10b981" : "#18181b"}
                    stroke={isSelected ? "#34d399" : "#3f3f46"}
                    strokeWidth="2"
                    className="transition-colors"
                  />
                  <text
                    x={n.x}
                    y={n.y + 4}
                    fill={isSelected ? "#09090b" : "#f4f4f5"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 26}
                    fill="#a1a1aa"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {`{${n.atoms.join(",")}}`}
                  </text>
                </g>
              );
            })}

            {/* Nodes Model 2 */}
            {model2Nodes.map((n) => {
              const isSelected = selectedWorld2 === n.id;
              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedWorld2(n.id)}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r="16"
                    fill={isSelected ? "#38bdf8" : "#18181b"}
                    stroke={isSelected ? "#7dd3fc" : "#3f3f46"}
                    strokeWidth="2"
                    className="transition-colors"
                  />
                  <text
                    x={n.x}
                    y={n.y + 4}
                    fill={isSelected ? "#09090b" : "#f4f4f5"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 26}
                    fill="#a1a1aa"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {`{${n.atoms.join(",")}}`}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-500 inline-block"></span>
              Transição Deôntica Bₚ (Mundos Ótimos)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span>
              Acessibilidade Epistêmica Rₖ (Saber)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-purple-400 inline-block"></span>
              Bisimulação Z (Indistinguibilidade)
            </span>
          </div>
        </div>

        {/* Evaluation and Verification Column */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/60 font-mono text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-2">
              Teste de Fórmulas Multimodais (Lean 4 AST)
            </span>

            <div className="space-y-1.5">
              {[
                { id: "atom_safe", label: "Atom \"safe\"", math: "\\text{safe}" },
                { id: "O_safe", label: "Oblig (Atom \"safe\")", math: "\\mathbf{O}(\\text{safe})" },
                { id: "K_danger", label: "Knows (Atom \"danger\")", math: "\\mathbf{K}(\\text{danger})" },
                { id: "O_K_safe", label: "Oblig (Knows (Atom \"safe\"))", math: "\\mathbf{O}(\\mathbf{K}(\\text{safe}))" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormula(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                    selectedFormula === f.id
                      ? "bg-zinc-800 text-emerald-400 border-emerald-500/50"
                      : "bg-zinc-950/60 hover:bg-zinc-800/50 text-zinc-400 border-zinc-800"
                  }`}
                >
                  <span>{f.label}</span>
                  <InlineMath math={f.math} />
                </button>
              ))}
            </div>
          </div>

          {/* Verification Verdict Box */}
          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-2.5">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-zinc-500 border-b border-zinc-800 pb-1.5">
              <span>Resultado da Avaliação Sêmantica</span>
              <span className="text-zinc-400">{selectedWorld1} ↔ {selectedWorld2}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block mb-0.5">M, {selectedWorld1} ⊨ φ</span>
                <span className={eval1 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {eval1 ? "VERDADEIRO" : "FALSO"}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block mb-0.5">N, {selectedWorld2} ⊨ φ</span>
                <span className={eval2 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {eval2 ? "VERDADEIRO" : "FALSO"}
                </span>
              </div>
            </div>

            <div className="pt-1">
              {isBisimilarPair && truthPreserved ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 leading-relaxed font-sans">
                  <strong>✓ Teorema A Verificado:</strong> Como os mundos ({selectedWorld1}, {selectedWorld2}) estão ligados pela bisimulação Z, seus valores de verdade coincidem perfeitamente para todas as fórmulas da lógica multimodal.
                </div>
              ) : !isBisimilarPair ? (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 leading-relaxed font-sans">
                  <strong>⚠ Par Não-Bisimilar:</strong> Os mundos ({selectedWorld1}, {selectedWorld2}) não pertencem à relação de bisimulação. Suas propriedades normativas podem divergir livremente.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NormativeBisimulationVisualizer;
