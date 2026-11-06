"use client";

import React, { useState } from "react";
import { InlineMath, BlockMath } from "react-katex";

type DilemmaType = "trolley" | "pandemic" | "no_conflict";

interface PerspectiveOutput {
  name: string;
  badge: string;
  ontology: string;
  rawAction: string;
  convergedAction: string;
  optimalWorlds: string;
}

export function MetaethicalConvergenceVisualizer() {
  const [dilemma, setDilemma] = useState<DilemmaType>("no_conflict");
  const [bridgeE, setBridgeE] = useState(true);
  const [bridgeA, setBridgeA] = useState(true);
  const [bridgeC, setBridgeC] = useState(true);

  const allBridgesActive = bridgeE && bridgeA && bridgeC;

  const perspectives: PerspectiveOutput[] = [
    {
      name: "Deontologia Kantiana",
      badge: "Kantian p_kant",
      ontology: "Razões baseadas em tratar agentes como fins em si mesmos, nunca como meros meios.",
      rawAction: dilemma === "trolley" ? "Frear sem desvio (Não instrumentalizar)" : dilemma === "pandemic" ? "Consentimento estrito obrigatório" : "Ação universalizável A₁",
      convergedAction: dilemma === "trolley" ? "Minimizar dano sem violação" : dilemma === "pandemic" ? "Anonimização preservando agência" : "Ação Ótima Universal A*",
      optimalWorlds: dilemma === "no_conflict" ? "{ w_opt }" : "{ w_kant }",
    },
    {
      name: "Utilitarismo de Regras",
      badge: "Utilitarian p_util",
      ontology: "Maximização de bem-estar qualitativo agregado através de regras com menor custo moral.",
      rawAction: dilemma === "trolley" ? "Desvio para menor perda líquida" : dilemma === "pandemic" ? "Vigilância obrigatória pela saúde pública" : "Ação de utilidade máxima A₁",
      convergedAction: dilemma === "trolley" ? "Minimizar dano sem violação" : dilemma === "pandemic" ? "Anonimização preservando agência" : "Ação Ótima Universal A*",
      optimalWorlds: dilemma === "no_conflict" ? "{ w_opt }" : "{ w_util }",
    },
    {
      name: "Ética do Discurso",
      badge: "Habermas-Apel p_dis",
      ontology: "Validade procedural derivada do consenso contrafactual universal de todos os afetados (Princípio U).",
      rawAction: dilemma === "trolley" ? "Norma aceitável por todos em diálogo ideal" : dilemma === "pandemic" ? "Pacto deliberativo democrático" : "Consenso dialógico A₁",
      convergedAction: dilemma === "trolley" ? "Minimizar dano sem violação" : dilemma === "pandemic" ? "Anonimização preservando agência" : "Ação Ótima Universal A*",
      optimalWorlds: dilemma === "no_conflict" ? "{ w_opt }" : "{ w_dis }",
    },
    {
      name: "Construtivismo de Gewirth",
      badge: "Agency PGC p_gew",
      ontology: "Direitos categóricos derivados das condições constitutivas da agência (Liberdade e Bem-Estar).",
      rawAction: dilemma === "trolley" ? "Proteção das condições básicas de agência" : dilemma === "pandemic" ? "Garantia das condições básicas de saúde" : "Ação constitutiva A₁",
      convergedAction: dilemma === "trolley" ? "Minimizar dano sem violação" : dilemma === "pandemic" ? "Anonimização preservando agência" : "Ação Ótima Universal A*",
      optimalWorlds: dilemma === "no_conflict" ? "{ w_opt }" : "{ w_gew }",
    },
  ];

  return (
    <div className="my-8 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Simulador de Convergência Metaética (Pontes E+A+C)
          </h3>
          <p className="text-zinc-400 text-xs md:text-sm mt-0.5">
            Demonstração visual de como perspectivas ontologicamente incongruentes convergem exatamente na mesma obrigação de ação sob restrições de ponte.
          </p>
        </div>

        {/* Dilemma Selector */}
        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
          <button
            onClick={() => setDilemma("no_conflict")}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              dilemma === "no_conflict"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            Mundo Sem-Conflito (Teorema Kant-Util)
          </button>
          <button
            onClick={() => setDilemma("trolley")}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              dilemma === "trolley"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            Dilema Veicular
          </button>
          <button
            onClick={() => setDilemma("pandemic")}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              dilemma === "pandemic"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            Vigilância Pandêmica
          </button>
        </div>
      </div>

      {/* Bridge Toggles Bar */}
      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800/60 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-300 font-bold">
          <span>Pontes Metaéticas:</span>
          <span className="text-[10px] text-zinc-500 font-normal">Restrições mínimas de compatibilidade</span>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={bridgeE}
              onChange={() => setBridgeE(!bridgeE)}
              className="accent-emerald-500"
            />
            <span className={bridgeE ? "text-emerald-400" : "text-zinc-500"}>Ponte E (Endorsement)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={bridgeA}
              onChange={() => setBridgeA(!bridgeA)}
              className="accent-emerald-500"
            />
            <span className={bridgeA ? "text-emerald-400" : "text-zinc-500"}>Ponte A (Admissibility)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={bridgeC}
              onChange={() => setBridgeC(!bridgeC)}
              className="accent-emerald-500"
            />
            <span className={bridgeC ? "text-emerald-400" : "text-zinc-500"}>Ponte C (Constitutivity)</span>
          </label>
        </div>
      </div>

      {/* Convergence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {perspectives.map((p, idx) => {
          const isActionUnified = allBridgesActive || dilemma === "no_conflict";
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                isActionUnified
                  ? "bg-zinc-900/40 border-emerald-500/30 shadow-lg shadow-emerald-950/10"
                  : "bg-zinc-900/20 border-zinc-800"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-sm text-zinc-100">{p.name}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {p.badge}
                </span>
              </div>

              <p className="text-xs text-zinc-400 font-serif leading-relaxed mb-3">
                <strong className="text-zinc-300 font-sans">Ontologia de Razões: </strong>
                {p.ontology}
              </p>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Mundos Ótimos Bₚ(w):</span>
                  <span className="text-purple-400 font-bold">{p.optimalWorlds}</span>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-900 pt-1.5">
                  <span className="text-zinc-500">Ação Obrigatória O(Act):</span>
                  <span className={isActionUnified ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {isActionUnified ? p.convergedAction : p.rawAction}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proof Result Callout */}
      <div className="mt-6 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-zinc-300 font-bold">
          <span>Status do Teorema (Isabelle/HOL & Lean 4):</span>
          <span className={allBridgesActive || dilemma === "no_conflict" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {allBridgesActive || dilemma === "no_conflict" ? "CONVERGÊNCIA DEÔNTICA COMPLETA" : "DIVERGÊNCIA PARCIAL"}
          </span>
        </div>
        <p className="text-zinc-400 font-serif text-xs leading-relaxed m-0">
          {dilemma === "no_conflict" ? (
            <span>
              <strong>Teorema de Confrontação Kant-Utilitarismo Verificado:</strong> Em qualquer mundo onde maximizar a utilidade não exige tratar agentes como meros meios, as relações de seleção são formalmente idênticas: <InlineMath math="B_{p\_kant}(w) = B_{p\_util}(w)" />. As duas maiores tradições da ética ocidental convergem de forma pura.
            </span>
          ) : allBridgesActive ? (
            <span>
              <strong>Teorema de Equivalência Deôntica de Ação Verificado:</strong> Com as três pontes <InlineMath math="E \wedge A \wedge C" /> ativas, todas as 4 perspectivas geram o mesmo veredito de ação obrigatória, apesar de possuírem ontologias de razões diametralmente opostas.
            </span>
          ) : (
            <span>
              Sem as restrições completas de ponte, as teorias divergem em suas prescrições de ação, demonstrando a fronteira exata calculada no UNC onde a reconciliação metaética se rompe.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default MetaethicalConvergenceVisualizer;
