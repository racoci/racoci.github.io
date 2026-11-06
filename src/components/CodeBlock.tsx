"use client";

import React, { useState } from "react";

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
}

// Lean 4 Keywords
const LEAN_KEYWORDS = new Set([
  "theorem", "lemma", "def", "inductive", "structure", "class", "instance",
  "where", "by", "deriving", "namespace", "end", "open", "variable",
  "import", "example", "axiom", "universe", "if", "then", "else",
  "match", "with", "fun", "let", "have", "show", "from", "return",
  "do", "mut", "for", "in", "macro", "syntax", "scoped", "local",
  "attribute", "set_option", "section"
]);

// Lean 4 Tactics
const LEAN_TACTICS = new Set([
  "exact", "intro", "intros", "apply", "rw", "simp", "cases",
  "induction", "constructor", "use", "decide", "rfl", "contradiction",
  "sorry", "assumption", "obtain", "rcases", "ext", "split", "revert",
  "ring", "linarith", "positivity", "norm_num", "aesop", "tauto"
]);

// Lean 4 Types & Universes
const LEAN_TYPES = new Set([
  "Prop", "Type", "Sort", "Nat", "Int", "Bool", "String", "List",
  "Option", "True", "False", "Ordinal", "DecidableEq", "Repr",
  "PartialOrder", "Four", "DialecticalProp", "KripkeWorld", "ModalProp",
  "ClosureOperator", "Char", "Float", "Array", "Unit", "Empty", "Fin"
]);

// Lean 4 Constants & Values
const LEAN_CONSTANTS = new Set([
  "true", "false", "both", "neither", "none", "some", "nil", "cons",
  "zero", "succ", "top", "bot", "rfl"
]);

function highlightLeanLine(line: string): React.ReactNode[] {
  // 1. Check for single line comments: -- ...
  const commentIdx = line.indexOf("--");
  let codePart = line;
  let commentPart = "";

  if (commentIdx !== -1) {
    codePart = line.slice(0, commentIdx);
    commentPart = line.slice(commentIdx);
  }

  // Tokenize the code part
  const tokenRegex = /(\s+|[a-zA-Z_][a-zA-Z0-9_'.]*|:=|->|<-|→|←|∧|∨|¬|∀|∃|≤|≥|≠|↔|⊢|⊣|·|⟨|⟩|λ|≅|::|\||\[|\]|\(|\)|\{|\}|:|,|[0-9]+|"[^"]*")/g;
  const nodes: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(codePart.slice(lastIndex, match.index));
    }
    const token = match[0];
    lastIndex = match.index + token.length;

    if (/^\s+$/.test(token)) {
      nodes.push(token);
    } else if (token.startsWith('"') && token.endsWith('"')) {
      nodes.push(
        <span key={nodes.length} className="text-amber-300">
          {token}
        </span>
      );
    } else if (LEAN_KEYWORDS.has(token)) {
      nodes.push(
        <span key={nodes.length} className="text-purple-400 font-semibold">
          {token}
        </span>
      );
    } else if (LEAN_TACTICS.has(token)) {
      nodes.push(
        <span key={nodes.length} className="text-emerald-400 font-medium">
          {token}
        </span>
      );
    } else if (LEAN_TYPES.has(token)) {
      nodes.push(
        <span key={nodes.length} className="text-sky-400 font-medium">
          {token}
        </span>
      );
    } else if (LEAN_CONSTANTS.has(token)) {
      nodes.push(
        <span key={nodes.length} className="text-amber-400 font-medium">
          {token}
        </span>
      );
    } else if (/^[0-9]+$/.test(token)) {
      nodes.push(
        <span key={nodes.length} className="text-amber-300 font-mono">
          {token}
        </span>
      );
    } else if (/^(:=|->|<-|→|←|∧|∨|¬|∀|∃|≤|≥|≠|↔|⊢|⊣|·|⟨|⟩|λ|≅|::|\|)$/.test(token)) {
      nodes.push(
        <span key={nodes.length} className="text-amber-400 font-bold">
          {token}
        </span>
      );
    } else if (/^([()\[\]{}:,])$/.test(token)) {
      nodes.push(
        <span key={nodes.length} className="text-zinc-400">
          {token}
        </span>
      );
    } else {
      nodes.push(
        <span key={nodes.length} className="text-zinc-100">
          {token}
        </span>
      );
    }
  }

  if (lastIndex < codePart.length) {
    nodes.push(codePart.slice(lastIndex));
  }

  if (commentPart) {
    nodes.push(
      <span key={nodes.length} className="text-zinc-500 italic">
        {commentPart}
      </span>
    );
  }

  return nodes;
}

export default function CodeBlock({ children, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const rawCode =
    typeof children === "string"
      ? children.replace(/\n$/, "")
      : String(children || "").replace(/\n$/, "");

  const langMatch = className.match(/language-(\w+)/);
  const language = langMatch ? langMatch[1] : "text";
  const isLean = language === "lean" || language === "lean4";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const lines = rawCode.split("\n");

  return (
    <div className="relative group my-6 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[11px]">
            {isLean ? "Lean 4" : language.toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer border border-zinc-700/40"
          title="Copiar código"
        >
          {copied ? (
            <>
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-400 font-bold">Copiado!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area with Syntax Highlighting */}
      <div className="p-4 overflow-x-auto text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
        <pre className="p-0 m-0 bg-transparent border-none text-zinc-100">
          <code>
            {isLean
              ? lines.map((line, idx) => (
                  <div key={idx} className="table-row">
                    <span className="table-cell select-none pr-4 text-right text-zinc-600 text-[11px] w-8">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre">
                      {highlightLeanLine(line)}
                    </span>
                  </div>
                ))
              : rawCode}
          </code>
        </pre>
      </div>
    </div>
  );
}
