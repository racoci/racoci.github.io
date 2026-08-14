"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

// Import all rich interactive widgets to enable direct live embedding inside the MDX preview!
import ComplexPlotter from "../../../components/complex-plotter/ComplexPlotter";
import NodeGraftViewer from "../../../components/NodeGraftViewer";
import B3Screener from "../../../components/B3Screener";
import SudokuViewer from "../../../components/SudokuViewer";
import SudokuMiniWidget from "../../../components/SudokuMiniWidget";
import QuadtreeVisualizer from "../../../components/fta/QuadtreeVisualizer";
import MappingVisualizer from "../../../components/fta/MappingVisualizer";
import CountersVisualizer from "../../../components/fta/CountersVisualizer";
import PolynomialEditor from "../../../components/fta/PolynomialEditor";
import InnerProductWindingVisualizer from "../../../components/fta/InnerProductWindingVisualizer";
import { OrthogonalProjectionVisualizer, ErrorDiskConstraintVisualizer, AsymptoticScalingVisualizer } from "../../../components/fta/VectorWindingVisualizers";

interface DraftFile {
  name: string;
  path: string;
  sha: string;
  content?: string;
}

interface Token {
  type: "text" | "math_inline" | "math_block" | "code" | "widget";
  content: string;
  lang?: string;
  widgetName?: string;
}

// Custom zero-dependency PlantUML compressor using native browser CompressionStream
function encode6bit(b: number): string {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return "-";
  if (b === 1) return "_";
  return "?";
}

function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1 & 0x3f) + encode6bit(c2 & 0x3f) + encode6bit(c3 & 0x3f) + encode6bit(c4 & 0x3f);
}

function encode64(data: Uint8Array): string {
  let r = "";
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 < data.length) {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    } else if (i + 1 < data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else {
      r += append3bytes(data[i], 0, 0);
    }
  }
  return r;
}

async function compressPlantUML(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const stream = new Response(bytes).body?.pipeThrough(new CompressionStream("deflate"));
  if (!stream) return "";
  const compressedBytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return encode64(compressedBytes);
}

// PlantUML Rendering Component
function PlantUMLRenderer({ code }: { code: string }) {
  const [encoded, setEncoded] = useState<string>("");

  useEffect(() => {
    compressPlantUML(code).then(setEncoded);
  }, [code]);

  if (!encoded) return <div className="text-xs text-zinc-500 font-mono">Processando PlantUML...</div>;

  return (
    <div className="my-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-center overflow-auto">
      <img
        src={`https://www.plantuml.com/plantuml/svg/${encoded}`}
        alt="PlantUML Diagram"
        className="max-w-full h-auto bg-white/5 p-2 rounded"
      />
    </div>
  );
}

interface InlineToken {
  type: "text" | "strong" | "em" | "code" | "link";
  content: string;
  href?: string;
}

function splitInlineTokens(
  tokens: InlineToken[],
  regex: RegExp,
  createToken: (match: RegExpExecArray) => InlineToken
): InlineToken[] {
  const result: InlineToken[] = [];
  for (const t of tokens) {
    if (t.type !== "text") {
      result.push(t);
      continue;
    }

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    const text = t.content;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        result.push({ type: "text", content: text.substring(lastIndex, matchIndex) });
      }
      result.push(createToken(match));
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: "text", content: text.substring(lastIndex) });
    }
  }
  return result;
}

function parseInlineMarkdown(inputText: string): React.ReactNode[] {
  let tokens: InlineToken[] = [{ type: "text", content: inputText }];

  // 1. Split by Bold (**text**)
  tokens = splitInlineTokens(tokens, /\*\*([\s\S]*?)\*\*/g, (match) => ({
    type: "strong",
    content: match[1],
  }));

  // 2. Split by Italic (*text*)
  tokens = splitInlineTokens(tokens, /\*([\s\S]*?)\*/g, (match) => ({
    type: "em",
    content: match[1],
  }));

  // 3. Split by Inline Code (`text`)
  tokens = splitInlineTokens(tokens, /`([^`]+?)`/g, (match) => ({
    type: "code",
    content: match[1],
  }));

  // 4. Split by Links ([text](url))
  tokens = splitInlineTokens(tokens, /\[([^\]]+?)\]\(([^)]+?)\)/g, (match) => ({
    type: "link",
    content: match[1],
    href: match[2],
  }));

  return tokens.map((tok, idx) => {
    if (tok.type === "strong") return <strong key={idx} className="font-extrabold text-zinc-50">{tok.content}</strong>;
    if (tok.type === "em") return <em key={idx} className="italic text-zinc-300">{tok.content}</em>;
    if (tok.type === "code") return <code key={idx} className="font-mono text-[12px] text-emerald-400 bg-zinc-900/80 border border-zinc-850 px-1.5 py-0.5 rounded-md">{tok.content}</code>;
    if (tok.type === "link") return <a key={idx} href={tok.href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-bold">{tok.content}</a>;
    return tok.content;
  });
}

interface TableData {
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
}

function parseMarkdownTable(markdown: string): TableData | null {
  const lines = markdown.split("\n").map(l => l.trim()).filter(l => l.startsWith("|") && l.endsWith("|"));
  if (lines.length === 0) return null;

  let alignIdx = -1;
  let alignments: ("left" | "center" | "right")[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split("|").map(c => c.trim()).slice(1, -1);
    if (cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c))) {
      alignIdx = i;
      alignments = cells.map(c => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        return "left";
      });
      break;
    }
  }

  let headers: string[] = [];
  let rows: string[][] = [];

  if (alignIdx !== -1) {
    const headerLine = lines[alignIdx - 1];
    if (headerLine) {
      headers = headerLine.split("|").map(c => c.trim()).slice(1, -1);
    }
    
    for (let i = 0; i < lines.length; i++) {
      if (i === alignIdx || i === alignIdx - 1) continue;
      const cells = lines[i].split("|").map(c => c.trim()).slice(1, -1);
      rows.push(cells);
    }
  } else {
    headers = lines[0].split("|").map(c => c.trim()).slice(1, -1);
    alignments = headers.map(() => "left");
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split("|").map(c => c.trim()).slice(1, -1);
      rows.push(cells);
    }
  }

  const numCols = headers.length;
  if (numCols === 0) return null;

  rows = rows.map(r => {
    const newRow = [...r];
    while (newRow.length < numCols) newRow.push("");
    if (newRow.length > numCols) newRow.splice(numCols);
    return newRow;
  });

  while (alignments.length < numCols) alignments.push("left");

  return { headers, alignments, rows };
}

function serializeMarkdownTable(data: TableData): string {
  const { headers, alignments, rows } = data;
  const headerStr = "| " + headers.join(" | ") + " |";
  const alignStr = "| " + alignments.map(a => {
    if (a === "center") return ":---:";
    if (a === "right") return "---:";
    return ":---";
  }).join(" | ") + " |";
  
  const rowsStr = rows.map(r => "| " + r.join(" | ") + " |").join("\n");
  
  return `${headerStr}\n${alignStr}\n${rowsStr}`;
}

interface BlockPart {
  type: "text" | "table";
  content: string;
}

function parseBlockParts(text: string): BlockPart[] {
  const lines = text.split("\n");
  const parts: BlockPart[] = [];
  let currentTextLines: string[] = [];
  let currentTableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith("|") && trimmed.endsWith("|");

    if (isTableLine) {
      if (!inTable) {
        if (currentTextLines.length > 0) {
          parts.push({ type: "text", content: currentTextLines.join("\n") });
          currentTextLines = [];
        }
        inTable = true;
      }
      currentTableLines.push(line);
    } else {
      if (inTable) {
        if (currentTableLines.length > 0) {
          parts.push({ type: "table", content: currentTableLines.join("\n") });
          currentTableLines = [];
        }
        inTable = false;
      }
      currentTextLines.push(line);
    }
  }

  if (inTable && currentTableLines.length > 0) {
    parts.push({ type: "table", content: currentTableLines.join("\n") });
  } else if (currentTextLines.length > 0) {
    parts.push({ type: "text", content: currentTextLines.join("\n") });
  }

  return parts;
}

const WIDGET_SUGGESTIONS = [
  "ComplexPlotter",
  "NodeGraftViewer",
  "B3Screener",
  "SudokuViewer",
  "SudokuMiniWidget",
  "QuadtreeVisualizer",
  "MappingVisualizer",
  "CountersVisualizer",
  "PolynomialEditor",
  "InnerProductWindingVisualizer",
  "OrthogonalProjectionVisualizer",
  "ErrorDiskConstraintVisualizer",
  "AsymptoticScalingVisualizer"
];

function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  if (typeof window === "undefined") return { top: 0, left: 0 };
  
  const style = window.getComputedStyle(textarea);
  const div = document.createElement("div");
  document.body.appendChild(div);
  
  const copyStyles = [
    "direction", "boxSizing", "width", "height", "overflowX", "overflowY",
    "borderWidth", "borderStyle", "borderColor",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontSize", "fontFamily", "fontStyle", "fontWeight", "fontVariant",
    "textTransform", "textIndent", "textDecoration",
    "letterSpacing", "wordSpacing", "lineHeight", "whiteSpace", "wordBreak"
  ];
  
  copyStyles.forEach(prop => {
    (div.style as any)[prop] = (style as any)[prop];
  });
  
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordBreak = "break-word";
  
  const text = textarea.value;
  div.textContent = text.substring(0, position);
  
  const span = document.createElement("span");
  span.textContent = text.substring(position) || ".";
  div.appendChild(span);
  
  const top = span.offsetTop - textarea.scrollTop + 20;
  const left = span.offsetLeft - textarea.scrollLeft;
  
  document.body.removeChild(div);
  
  return {
    top: Math.min(top, textarea.clientHeight - 150),
    left: Math.min(left, textarea.clientWidth - 220)
  };
}

interface AutosizingBlockTextareaProps {
  defaultValue: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  className?: string;
}

function AutosizingBlockTextarea({
  defaultValue,
  onSave,
  onCancel,
  className,
}: AutosizingBlockTextareaProps) {
  const [val, setVal] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [autocomplete, setAutocomplete] = useState<{
    isOpen: boolean;
    query: string;
    triggerIndex: number;
    cursorIndex: number;
    selectedIndex: number;
    top: number;
    left: number;
  }>({
    isOpen: false,
    query: "",
    triggerIndex: -1,
    cursorIndex: -1,
    selectedIndex: 0,
    top: 0,
    left: 0,
  });

  const filteredSuggestions = WIDGET_SUGGESTIONS.filter((widget) =>
    widget.toLowerCase().includes(autocomplete.query.toLowerCase())
  );

  const adjustHeight = () => {
    const tx = textareaRef.current;
    if (tx) {
      tx.style.height = "auto";
      tx.style.height = `${tx.scrollHeight}px`;
    }
  };

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    adjustHeight();
  }, [val]);

  const checkAutocomplete = (target: HTMLTextAreaElement) => {
    const cursor = target.selectionStart;
    const textBefore = target.value.substring(0, cursor);
    const match = textBefore.match(/<([a-zA-Z0-9]*)$/);

    if (match) {
      const query = match[1];
      const triggerIndex = textBefore.length - match[0].length;
      const suggestions = WIDGET_SUGGESTIONS.filter((w) =>
        w.toLowerCase().includes(query.toLowerCase())
      );

      if (suggestions.length > 0) {
        const coords = getCaretCoordinates(target, cursor);
        setAutocomplete({
          isOpen: true,
          query,
          triggerIndex,
          cursorIndex: cursor,
          selectedIndex: 0,
          top: coords.top,
          left: coords.left,
        });
        return;
      }
    }
    setAutocomplete((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectSuggestion = (widgetName: string) => {
    const tx = textareaRef.current;
    if (!tx) return;

    const completedTag = `<${widgetName} />`;
    const before = val.substring(0, autocomplete.triggerIndex);
    const after = val.substring(autocomplete.cursorIndex);
    const newVal = before + completedTag + after;

    setVal(newVal);

    const newCursorPos = autocomplete.triggerIndex + completedTag.length;
    setTimeout(() => {
      tx.focus();
      tx.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setAutocomplete((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="relative w-full flex flex-col">
      <textarea
        ref={textareaRef}
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          checkAutocomplete(e.currentTarget);
        }}
        onKeyUp={(e) => checkAutocomplete(e.currentTarget)}
        onClick={(e) => checkAutocomplete(e.currentTarget)}
        autoFocus
        onBlur={() => {
          onSave(val);
        }}
        onKeyDown={(e) => {
          if (autocomplete.isOpen && filteredSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAutocomplete((prev) => ({
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % filteredSuggestions.length,
              }));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setAutocomplete((prev) => ({
                ...prev,
                selectedIndex: (prev.selectedIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length,
              }));
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              handleSelectSuggestion(filteredSuggestions[autocomplete.selectedIndex]);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setAutocomplete((prev) => ({ ...prev, isOpen: false }));
              return;
            }
          }

          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            onSave(val);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className={className}
        spellCheck="false"
      />

      {/* Autocomplete Overlay */}
      {autocomplete.isOpen && filteredSuggestions.length > 0 && (
        <div
          className="absolute z-50 bg-zinc-900/95 border border-zinc-800/80 rounded-xl shadow-2xl p-1.5 max-w-xs min-w-[220px] font-mono text-xs select-none backdrop-blur animate-fade-in animate-duration-150"
          style={{
            top: `${autocomplete.top}px`,
            left: `${autocomplete.left}px`,
          }}
        >
          <div className="px-2 py-1 text-[9px] font-bold tracking-widest text-zinc-500 border-b border-zinc-800 mb-1 uppercase">
            Componentes Disponíveis
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {filteredSuggestions.map((widget, idx) => {
              const isSelected = idx === autocomplete.selectedIndex;
              return (
                <div
                  key={widget}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(widget);
                  }}
                  onMouseEnter={() => setAutocomplete(prev => ({ ...prev, selectedIndex: idx }))}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-400 font-extrabold shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100"
                  }`}
                >
                  <span>{widget}</span>
                  {isSelected && <span className="text-[9px] bg-emerald-500/30 text-emerald-400 px-1 py-0.5 rounded font-bold">↵ ENTER</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface InteractiveTableProps {
  markdown: string;
  onUpdate: (newMarkdown: string) => void;
}

function InteractiveTable({ markdown, onUpdate }: InteractiveTableProps) {
  const tableData = parseMarkdownTable(markdown);
  
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    colIdx: number;
  } | null>(null);

  const [selectedCell, setSelectedCell] = useState<{
    rowIdx: number;
    colIdx: number;
  } | null>(null);

  const [editValue, setEditValue] = useState("");

  const [mobileMenuCell, setMobileMenuCell] = useState<{
    rowIdx: number;
    colIdx: number;
    x: number;
    y: number;
  } | null>(null);

  const touchStartRef = useRef<{
    rowIdx: number;
    colIdx: number;
    timer: any;
    startX: number;
    startY: number;
  } | null>(null);

  const preventContextMenuRef = useRef(false);

  if (!tableData) {
    return <div className="text-red-500 font-mono">Erro ao analisar tabela</div>;
  }

  const { headers, alignments, rows } = tableData;

  const handleCellClick = (rowIdx: number, colIdx: number, currentVal: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCell({ rowIdx, colIdx });
    setEditingCell({ rowIdx, colIdx });
    setEditValue(currentVal);
  };

  const saveActiveCell = () => {
    if (!editingCell) return;
    const { rowIdx, colIdx } = editingCell;

    const newHeaders = [...headers];
    const newRows = rows.map(r => [...r]);

    if (rowIdx === -1) {
      newHeaders[colIdx] = editValue;
    } else {
      newRows[rowIdx][colIdx] = editValue;
    }

    const updatedData: TableData = {
      headers: newHeaders,
      alignments,
      rows: newRows,
    };

    onUpdate(serializeMarkdownTable(updatedData));
    setEditingCell(null);
  };

  const isRowFilled = (rowIdx: number): boolean => {
    if (rowIdx < 0 || rowIdx >= rows.length) return false;
    const row = rows[rowIdx];
    return row.some(cell => cell.trim().length > 0);
  };

  const isColumnFilled = (colIdx: number): boolean => {
    if (colIdx < 0 || colIdx >= headers.length) return false;
    const headerText = headers[colIdx].trim();
    const isDefaultHeader = /^Col \d+$/i.test(headerText);
    if (headerText.length > 0 && !isDefaultHeader) return true;
    return rows.some(row => row[colIdx] && row[colIdx].trim().length > 0);
  };

  const handleAddRowAt = (rowIdx: number) => {
    const newRow = Array(headers.length).fill("");
    const insertIdx = rowIdx + 1;
    const newRows = [...rows];
    newRows.splice(insertIdx, 0, newRow);

    const updatedData: TableData = {
      headers,
      alignments,
      rows: newRows,
    };

    onUpdate(serializeMarkdownTable(updatedData));
    setSelectedCell({ rowIdx: insertIdx, colIdx: selectedCell?.colIdx ?? 0 });
  };

  const handleAddColumnAt = (colIdx: number) => {
    const insertIdx = colIdx + 1;

    const newHeaders = [...headers];
    newHeaders.splice(insertIdx, 0, `Col ${newHeaders.length + 1}`);

    const newAlignments = [...alignments];
    newAlignments.splice(insertIdx, 0, "left");

    const newRows = rows.map(r => {
      const nr = [...r];
      nr.splice(insertIdx, 0, "");
      return nr;
    });

    const updatedData: TableData = {
      headers: newHeaders,
      alignments: newAlignments,
      rows: newRows,
    };

    onUpdate(serializeMarkdownTable(updatedData));
    setSelectedCell({ rowIdx: selectedCell?.rowIdx ?? -1, colIdx: insertIdx });
  };

  const handleDeleteRowAt = (rowIdx: number) => {
    if (rows.length <= 1) return;

    if (isRowFilled(rowIdx)) {
      const confirmDelete = window.confirm("Esta linha contém dados. Tem certeza que deseja excluí-la?");
      if (!confirmDelete) return;
    }

    const newRows = rows.filter((_, i) => i !== rowIdx);

    const updatedData: TableData = {
      headers,
      alignments,
      rows: newRows,
    };

    onUpdate(serializeMarkdownTable(updatedData));
    
    const nextRowIdx = Math.min(rowIdx, newRows.length - 1);
    setSelectedCell({ rowIdx: nextRowIdx, colIdx: selectedCell?.colIdx ?? 0 });
  };

  const handleDeleteColumnAt = (colIdx: number) => {
    if (headers.length <= 1) return;

    if (isColumnFilled(colIdx)) {
      const confirmDelete = window.confirm("Esta coluna contém dados. Tem certeza que deseja excluí-la?");
      if (!confirmDelete) return;
    }

    const newHeaders = headers.filter((_, i) => i !== colIdx);
    const newAlignments = alignments.filter((_, i) => i !== colIdx);
    const newRows = rows.map(r => r.filter((_, i) => i !== colIdx));

    const updatedData: TableData = {
      headers: newHeaders,
      alignments: newAlignments,
      rows: newRows,
    };

    onUpdate(serializeMarkdownTable(updatedData));
    
    const nextColIdx = Math.min(colIdx, newHeaders.length - 1);
    setSelectedCell({ rowIdx: selectedCell?.rowIdx ?? -1, colIdx: nextColIdx });
  };

  const handleAddRow = () => {
    const activeRowIdx = selectedCell && selectedCell.rowIdx >= 0 ? selectedCell.rowIdx : rows.length - 1;
    handleAddRowAt(activeRowIdx);
  };

  const handleAddColumn = () => {
    const activeColIdx = selectedCell ? selectedCell.colIdx : headers.length - 1;
    handleAddColumnAt(activeColIdx);
  };

  const handleDeleteActiveRow = () => {
    const deleteIdx = selectedCell && selectedCell.rowIdx >= 0 ? selectedCell.rowIdx : rows.length - 1;
    handleDeleteRowAt(deleteIdx);
  };

  const handleDeleteActiveColumn = () => {
    const deleteIdx = selectedCell ? selectedCell.colIdx : headers.length - 1;
    handleDeleteColumnAt(deleteIdx);
  };

  const handleTouchStart = (rowIdx: number, colIdx: number, e: React.TouchEvent) => {
    if (editingCell) return;

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    if (touchStartRef.current?.timer) {
      clearTimeout(touchStartRef.current.timer);
    }

    const timer = setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (err) {
          // Ignore vibration failures if unsupported or blocked
        }
      }
      
      setSelectedCell({ rowIdx, colIdx });
      setMobileMenuCell({
        rowIdx,
        colIdx,
        x: startX,
        y: startY
      });
      
      preventContextMenuRef.current = true;
      touchStartRef.current = null;
    }, 500);

    touchStartRef.current = {
      rowIdx,
      colIdx,
      timer,
      startX,
      startY
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartRef.current.startX);
    const diffY = Math.abs(touch.clientY - touchStartRef.current.startY);

    if (diffX > 10 || diffY > 10) {
      clearTimeout(touchStartRef.current.timer);
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current) {
      clearTimeout(touchStartRef.current.timer);
      touchStartRef.current = null;
    }
  };

  return (
    <div
      className="relative group my-6 border border-zinc-850 rounded-xl bg-zinc-900/10 p-2 overflow-visible select-text"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute -top-3.5 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg shadow-xl z-20">
        <button
          onClick={(e) => { e.stopPropagation(); handleAddRow(); }}
          className="p-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-300 font-extrabold flex items-center gap-1 transition-colors"
          title="Adicionar Linha"
        >
          <span className="text-emerald-500 font-mono font-bold">+</span>
          <span>Linha</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleAddColumn(); }}
          className="p-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-300 font-extrabold flex items-center gap-1 transition-colors"
          title="Adicionar Coluna"
        >
          <span className="text-emerald-500 font-mono font-bold">+</span>
          <span>Coluna</span>
        </button>
        <div className="w-px h-3 bg-zinc-800 mx-1" />
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteActiveRow(); }}
          className={`p-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 hover:text-red-400 font-extrabold flex items-center gap-1 transition-colors ${
            rows.length <= 1 ? "opacity-30 cursor-not-allowed" : ""
          }`}
          disabled={rows.length <= 1}
          title="Excluir Linha Ativa"
        >
          <span className="text-red-500 font-mono font-bold">-</span>
          <span>Linha</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteActiveColumn(); }}
          className={`p-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 hover:text-red-400 font-extrabold flex items-center gap-1 transition-colors ${
            headers.length <= 1 ? "opacity-30 cursor-not-allowed" : ""
          }`}
          disabled={headers.length <= 1}
          title="Excluir Coluna Ativa"
        >
          <span className="text-red-500 font-mono font-bold">-</span>
          <span>Coluna</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full divide-y divide-zinc-800 text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-900/40">
              {headers.map((h, cIdx) => {
                const isEditing = editingCell?.rowIdx === -1 && editingCell?.colIdx === cIdx;
                const isSelected = selectedCell?.colIdx === cIdx;
                const alignmentClass =
                  alignments[cIdx] === "center" ? "text-center" :
                  alignments[cIdx] === "right" ? "text-right" : "text-left";

                return (
                  <th
                    key={cIdx}
                    className={`px-4 py-3 relative border-r border-zinc-800 last:border-none font-bold font-sans text-zinc-300 cursor-pointer group/cell select-text ${alignmentClass} ${
                      isSelected ? "bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/20" : "hover:bg-zinc-800/20"
                    }`}
                    onClick={(e) => handleCellClick(-1, cIdx, h, e)}
                    onTouchStart={(e) => handleTouchStart(-1, cIdx, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      if (preventContextMenuRef.current) {
                        e.preventDefault();
                        preventContextMenuRef.current = false;
                      }
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveActiveCell}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveActiveCell();
                          } else if (e.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-zinc-950 text-zinc-50 px-2 py-1 rounded border border-emerald-500 outline-none font-sans text-sm"
                      />
                    ) : (
                      <div className="min-h-[1.5rem] flex items-center justify-between gap-1 w-full relative">
                        <span className="flex-1">{parseInlineMarkdown(h)}</span>
                        <span className="text-[8px] font-mono text-zinc-600 opacity-0 group-hover/cell:opacity-100 transition-opacity font-bold uppercase shrink-0">
                          edit
                        </span>
                      </div>
                    )}

                    {/* Hover insert buttons */}
                    {!isEditing && (
                      <>
                        {/* Vertical insert (+) on the right border */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddColumnAt(cIdx);
                          }}
                          className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center translate-x-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 z-30 select-none cursor-pointer"
                          title="Adicionar coluna após"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md transform hover:scale-110 active:scale-95 transition-all">
                            +
                          </span>
                        </button>

                        {/* Horizontal insert (+) on the bottom border */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddRowAt(-1); // inserts at index 0 (after headers)
                          }}
                          className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 z-30 select-none cursor-pointer"
                          title="Adicionar linha após"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md transform hover:scale-110 active:scale-95 transition-all">
                            +
                          </span>
                        </button>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((row, rIdx) => {
              const isRowSelected = selectedCell?.rowIdx === rIdx;

              return (
                <tr
                  key={rIdx}
                  className={`hover:bg-zinc-900/10 ${
                    isRowSelected ? "bg-emerald-500/[0.02]" : ""
                  }`}
                >
                  {row.map((cell, cIdx) => {
                    const isEditing = editingCell?.rowIdx === rIdx && editingCell?.colIdx === cIdx;
                    const isSelected = selectedCell?.rowIdx === rIdx && selectedCell?.colIdx === cIdx;
                    const alignmentClass =
                      alignments[cIdx] === "center" ? "text-center" :
                      alignments[cIdx] === "right" ? "text-right" : "text-left";

                    return (
                      <td
                        key={cIdx}
                        className={`px-4 py-3 relative border-r border-zinc-800 last:border-none font-serif text-zinc-400 cursor-pointer group/cell select-text ${alignmentClass} ${
                          isSelected
                            ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40"
                            : isRowSelected || selectedCell?.colIdx === cIdx
                            ? "bg-emerald-500/[0.01]"
                            : "hover:bg-zinc-900/30"
                        }`}
                        onClick={(e) => handleCellClick(rIdx, cIdx, cell, e)}
                        onTouchStart={(e) => handleTouchStart(rIdx, cIdx, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onContextMenu={(e) => {
                          if (preventContextMenuRef.current) {
                            e.preventDefault();
                            preventContextMenuRef.current = false;
                          }
                        }}
                      >
                        {isEditing ? (
                          <textarea
                            value={editValue}
                            autoFocus
                            rows={1}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = "auto";
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                            onBlur={saveActiveCell}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveActiveCell();
                              } else if (e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-zinc-950 text-zinc-100 px-2 py-1 rounded border border-emerald-500 outline-none font-serif text-sm resize-none overflow-hidden"
                          />
                        ) : (
                          <div className="min-h-[1.5rem] flex items-center justify-between gap-1 w-full relative">
                            <span className="flex-1">{parseInlineMarkdown(cell)}</span>
                            <span className="text-[8px] font-mono text-zinc-600 opacity-0 group-hover/cell:opacity-100 transition-opacity font-bold uppercase shrink-0">
                              edit
                            </span>
                          </div>
                        )}

                        {/* Hover insert buttons */}
                        {!isEditing && (
                          <>
                            {/* Vertical insert (+) on the right border */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddColumnAt(cIdx);
                              }}
                              className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center translate-x-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 z-30 select-none cursor-pointer"
                              title="Adicionar coluna após"
                            >
                              <span className="w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md transform hover:scale-110 active:scale-95 transition-all">
                                +
                              </span>
                            </button>

                            {/* Horizontal insert (+) on the bottom border */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddRowAt(rIdx);
                              }}
                              className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 z-30 select-none cursor-pointer"
                              title="Adicionar linha após"
                            >
                              <span className="w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md transform hover:scale-110 active:scale-95 transition-all">
                                +
                              </span>
                            </button>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Long-Press Context Menu Overlay / Bottom Sheet */}
      {mobileMenuCell && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs select-none"
          onClick={() => setMobileMenuCell(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-zinc-300 font-sans">
                Ações da Célula ({mobileMenuCell.rowIdx === -1 ? "Cabeçalho" : `Linha ${mobileMenuCell.rowIdx + 1}`}, Col {mobileMenuCell.colIdx + 1})
              </h3>
              <button
                onClick={() => setMobileMenuCell(null)}
                className="text-zinc-500 hover:text-zinc-300 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  handleAddRowAt(mobileMenuCell.rowIdx);
                  setMobileMenuCell(null);
                }}
                className="w-full text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-200 text-sm font-semibold flex items-center gap-3 transition-colors"
              >
                <span className="text-emerald-500 font-mono font-bold text-base">+</span>
                <span>Adicionar Linha</span>
              </button>
              <button
                onClick={() => {
                  handleAddColumnAt(mobileMenuCell.colIdx);
                  setMobileMenuCell(null);
                }}
                className="w-full text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-200 text-sm font-semibold flex items-center gap-3 transition-colors"
              >
                <span className="text-emerald-500 font-mono font-bold text-base">+</span>
                <span>Adicionar Coluna</span>
              </button>
              
              <div className="h-px bg-zinc-800 my-1" />

              <button
                onClick={() => {
                  handleDeleteRowAt(mobileMenuCell.rowIdx);
                  setMobileMenuCell(null);
                }}
                disabled={rows.length <= 1 || mobileMenuCell.rowIdx === -1}
                className={`w-full text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-3 transition-colors ${
                  rows.length <= 1 || mobileMenuCell.rowIdx === -1 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <span className="text-red-500 font-mono font-bold text-base">-</span>
                <span>Excluir Linha</span>
              </button>
              <button
                onClick={() => {
                  handleDeleteColumnAt(mobileMenuCell.colIdx);
                  setMobileMenuCell(null);
                }}
                disabled={headers.length <= 1}
                className={`w-full text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-3 transition-colors ${
                  headers.length <= 1 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <span className="text-red-500 font-mono font-bold text-base">-</span>
                <span>Excluir Coluna</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TextAndTableRenderer({
  text,
  onUpdate,
}: {
  text: string;
  onUpdate: (newVal: string) => void;
}) {
  const parts = parseBlockParts(text);

  return (
    <>
      {parts.map((part, pIdx) => {
        if (part.type === "table") {
          return (
            <InteractiveTable
              key={pIdx}
              markdown={part.content}
              onUpdate={(newTableMarkdown) => {
                const updatedParts = [...parts];
                updatedParts[pIdx] = { ...part, content: newTableMarkdown };
                const newText = updatedParts.map(p => p.content).join("\n");
                onUpdate(newText);
              }}
            />
          );
        }

        return (
          <React.Fragment key={pIdx}>
            {renderMarkdownWithTables(part.content)}
          </React.Fragment>
        );
      })}
    </>
  );
}

function serializeTokens(tokens: Token[]): string {
  return tokens.map(t => {
    if (t.type === "text") return t.content;
    if (t.type === "math_inline") return `$${t.content}$`;
    if (t.type === "math_block") return `$$${t.content}$$`;
    if (t.type === "code") return `\`\`\`${t.lang || ""}\n${t.content}\n\`\`\``;
    if (t.type === "widget") return t.content;
    return "";
  }).join("");
}

function BlockContentRenderer({
  text,
  onBlockUpdate,
  lang,
}: {
  text: string;
  onBlockUpdate: (newVal: string) => void;
  lang: string;
}) {
  const tokens = parseMDXContent(text);
  
  return (
    <>
      {tokens.map((token, tIdx) => {
        if (token.type === "text") {
          return (
            <TextAndTableRenderer
              key={tIdx}
              text={token.content}
              onUpdate={(newText) => {
                const newTokens = [...tokens];
                newTokens[tIdx] = { ...token, content: newText };
                const serialized = serializeTokens(newTokens);
                onBlockUpdate(serialized);
              }}
            />
          );
        }

        if (token.type === "math_inline") {
          return <InlineMath key={tIdx} math={token.content} />;
        }

        if (token.type === "math_block") {
          return <BlockMath key={tIdx} math={token.content} />;
        }

        if (token.type === "code") {
          if (token.lang === "plantuml") {
            return <PlantUMLRenderer key={tIdx} code={token.content} />;
          }

          return (
            <pre key={tIdx} className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-x-auto font-mono text-xs text-zinc-100 my-4">
              <code>{token.content}</code>
            </pre>
          );
        }

        if (token.type === "widget") {
          return (
            <div key={tIdx} className="my-8 border border-zinc-800/50 p-4 bg-zinc-900/10 rounded-2xl relative shadow-inner overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-zinc-950/80 border border-zinc-800 rounded font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold z-20">
                Reativo: {token.widgetName}
              </div>
              {token.widgetName === "ComplexPlotter" && <ComplexPlotter />}
              {token.widgetName === "NodeGraftViewer" && <NodeGraftViewer lang={lang as "en" | "pt"} />}
              {token.widgetName === "B3Screener" && <B3Screener lang={lang as "en" | "pt"} />}
              {token.widgetName === "SudokuViewer" && <SudokuViewer lang={lang as "en" | "pt"} />}
              {token.widgetName === "SudokuMiniWidget" && <SudokuMiniWidget lang={lang as "en" | "pt"} />}
              {token.widgetName === "QuadtreeVisualizer" && <QuadtreeVisualizer />}
              {token.widgetName === "MappingVisualizer" && <MappingVisualizer />}
              {token.widgetName === "CountersVisualizer" && <CountersVisualizer />}
              {token.widgetName === "PolynomialEditor" && <PolynomialEditor />}
              {token.widgetName === "InnerProductWindingVisualizer" && <InnerProductWindingVisualizer />}
              {token.widgetName === "OrthogonalProjectionVisualizer" && <OrthogonalProjectionVisualizer />}
              {token.widgetName === "ErrorDiskConstraintVisualizer" && <ErrorDiskConstraintVisualizer />}
              {token.widgetName === "AsymptoticScalingVisualizer" && <AsymptoticScalingVisualizer />}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}

// Symmetrical live Markdown block & inline compiler
function renderMarkdownWithTables(text: string) {
  const lines = text.split("\n");
  let inTable = false;
  const tableRows: string[][] = [];
  let inList = false;
  const listItems: React.ReactNode[] = [];
  const elements: React.ReactNode[] = [];
  let keyCounter = 0;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="list-disc list-inside space-y-1.5 my-4 text-zinc-300 pl-2">
          {listItems.map((item, idx) => <li key={idx} className="font-serif leading-relaxed text-sm md:text-base">{item}</li>)}
        </ul>
      );
      listItems.length = 0;
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      elements.push(
        <div key={`tab-${keyCounter++}`} className="overflow-x-auto my-6 border border-zinc-800 rounded-xl bg-zinc-900/10">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead>
              <tr className="bg-zinc-900/40">
                {tableRows[0].map((cell, cIdx) => (
                  <th key={cIdx} className="px-4 py-3 text-left font-bold font-sans text-zinc-300 border-r border-zinc-800 last:border-none">
                    {parseInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {tableRows.slice(1).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-900/20">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 font-serif text-zinc-400 border-r border-zinc-800 last:border-none">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows.length = 0;
      inTable = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Process Markdown Tables
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      inTable = true;
      const cells = trimmed.split("|").map(c => c.trim()).slice(1, -1);
      if (cells.every(c => /^:-*-:|^:-*-|^:-:|-+$/.test(c))) {
        continue;
      }
      tableRows.push(cells);
      continue;
    }

    // Outside tables, flush active table if any
    flushTable();

    // 2. Process Lists (lines starting with '* ' or '- ')
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      inList = true;
      const content = trimmed.substring(2);
      listItems.push(parseInlineMarkdown(content));
      continue;
    }

    // Outside lists, flush active list if any
    flushList();

    // 3. Process Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${keyCounter++}`} className="text-3xl font-extrabold tracking-tight text-zinc-50 mt-8 mb-4 font-sans border-b border-zinc-800/60 pb-2">
          {parseInlineMarkdown(trimmed.substring(2))}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${keyCounter++}`} className="text-2xl font-bold tracking-tight text-zinc-100 mt-6 mb-3 font-sans">
          {parseInlineMarkdown(trimmed.substring(3))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${keyCounter++}`} className="text-xl font-bold text-zinc-200 mt-5 mb-2 font-sans">
          {parseInlineMarkdown(trimmed.substring(4))}
        </h3>
      );
      continue;
    }

    // 4. Process Blockquotes
    if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote key={`bq-${keyCounter++}`} className="border-l-4 border-emerald-500 pl-4 py-1 my-4 italic text-zinc-400 bg-zinc-900/20 rounded-r-xl">
          {parseInlineMarkdown(trimmed.substring(2))}
        </blockquote>
      );
      continue;
    }

    // 5. Standard Paragraphs (skip completely empty lines to prevent double spacing)
    if (trimmed !== "") {
      elements.push(
        <p key={`p-${keyCounter++}`} className="my-3 text-zinc-300 leading-relaxed font-serif text-sm md:text-base">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  }

  // Flush any trailing elements
  flushTable();
  flushList();

  return <>{elements}</>;
}

// Recursive MDX split parser
function parseMDXContent(text: string): Token[] {
  let tokens: Token[] = [{ type: "text", content: text }];

  // 1. Split by Code Blocks (detecting languages like mermaid, plantuml)
  tokens = splitTokenList(tokens, /```(\w*)\n([\s\S]*?)```/g, (match) => ({
    type: "code",
    lang: match[1],
    content: match[2],
  }));

  // 2. Split by Math Display ($$ ... $$)
  tokens = splitTokenList(tokens, /\$\$([\s\S]*?)\$\$/g, (match) => ({
    type: "math_block",
    content: match[1],
  }));

  // 3. Split by Math Inline ($ ... $)
  tokens = splitTokenList(tokens, /\$([^\$\n]+?)\$/g, (match) => ({
    type: "math_inline",
    content: match[1],
  }));

  // 4. Split by Interactive Widgets
  tokens = splitTokenList(
    tokens,
    /<(ComplexPlotter|NodeGraftViewer|B3Screener|SudokuViewer|SudokuMiniWidget|QuadtreeVisualizer|MappingVisualizer|CountersVisualizer|PolynomialEditor|InnerProductWindingVisualizer|OrthogonalProjectionVisualizer|ErrorDiskConstraintVisualizer|AsymptoticScalingVisualizer)\s*\/>/g,
    (match) => ({
      type: "widget",
      widgetName: match[1],
      content: match[0],
    })
  );

  return tokens;
}

function splitTokenList(
  tokens: Token[],
  regex: RegExp,
  createToken: (match: RegExpExecArray) => Token
): Token[] {
  const result: Token[] = [];
  for (const t of tokens) {
    if (t.type !== "text") {
      result.push(t);
      continue;
    }

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    const text = t.content;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        result.push({ type: "text", content: text.substring(lastIndex, matchIndex) });
      }
      result.push(createToken(match));
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: "text", content: text.substring(lastIndex) });
    }
  }
  return result;
}

interface PageProps {
  params: Promise<{ lang: string }>;
}

function WorkspaceDashboard({ params }: PageProps) {
  const { lang } = React.use(params);
  const isPt = lang === "pt";
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [repo, setRepo] = useState("racoci/racoci.github.io");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const searchParams = useSearchParams();
  const urlDraft = searchParams.get("draft");

  // Drag-to-resize split view panel state
  const [splitWidth, setSplitWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseXRelative = e.clientX - containerRect.left;
    let newPercentage = (mouseXRelative / containerRect.width) * 100;
    if (newPercentage < 20) newPercentage = 20;
    if (newPercentage > 80) newPercentage = 80;
    setSplitWidth(newPercentage);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Layout View Mode state: "split" (Side-by-Side) vs "wysiwyg" (Single Seamless Editor)
  const [viewMode, setViewMode] = useState<"split" | "wysiwyg">("wysiwyg");

  // Draft States
  const [drafts, setDrafts] = useState<DraftFile[]>([]);
  const [activeDraft, setActiveDraft] = useState<DraftFile | null>(null);
  const [editorText, setEditorText] = useState("");
  const [slug, setSlug] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"saved" | "unsaved" | "syncing" | "error">("saved");

  // Autocomplete ref & states for the Split view code editor
  const mainTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [mainAutocomplete, setMainAutocomplete] = useState<{
    isOpen: boolean;
    query: string;
    triggerIndex: number;
    cursorIndex: number;
    selectedIndex: number;
    top: number;
    left: number;
  }>({
    isOpen: false,
    query: "",
    triggerIndex: -1,
    cursorIndex: -1,
    selectedIndex: 0,
    top: 0,
    left: 0,
  });

  const mainFilteredSuggestions = WIDGET_SUGGESTIONS.filter((widget) =>
    widget.toLowerCase().includes(mainAutocomplete.query.toLowerCase())
  );

  const checkMainAutocomplete = (target: HTMLTextAreaElement) => {
    const cursor = target.selectionStart;
    const textBefore = target.value.substring(0, cursor);
    const match = textBefore.match(/<([a-zA-Z0-9]*)$/);

    if (match) {
      const query = match[1];
      const triggerIndex = textBefore.length - match[0].length;
      const suggestions = WIDGET_SUGGESTIONS.filter((w) =>
        w.toLowerCase().includes(query.toLowerCase())
      );

      if (suggestions.length > 0) {
        const coords = getCaretCoordinates(target, cursor);
        setMainAutocomplete({
          isOpen: true,
          query,
          triggerIndex,
          cursorIndex: cursor,
          selectedIndex: 0,
          top: coords.top,
          left: coords.left,
        });
        return;
      }
    }
    setMainAutocomplete((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectMainSuggestion = (widgetName: string) => {
    const tx = mainTextareaRef.current;
    if (!tx) return;

    const completedTag = `<${widgetName} />`;
    const before = editorText.substring(0, mainAutocomplete.triggerIndex);
    const after = editorText.substring(mainAutocomplete.cursorIndex);
    const newVal = before + completedTag + after;

    handleEditorChange(newVal);

    const newCursorPos = mainAutocomplete.triggerIndex + completedTag.length;
    setTimeout(() => {
      tx.focus();
      tx.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setMainAutocomplete((prev) => ({ ...prev, isOpen: false }));
  };

  // Inline Block-based WYSIWYG states
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  // AI Prompt Co-pilot State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Login UI error/success messages
  const [loginError, setLoginError] = useState("");

  // Refs for tracking changes
  const lastSavedTextRef = useRef("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!token) {
      setLoginError("Por favor, forneça um Personal Access Token (PAT) válido.");
      return;
    }

    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Acesso negado.");
      
      localStorage.setItem("GITHUB_PAT", token);
      localStorage.setItem("GEMINI_API_KEY", geminiKey);
      localStorage.setItem("WORKSPACE_REPO", repo);
      setIsAuthenticated(true);
      fetchDraftsList(token, repo);
    } catch (err) {
      setLoginError("Token inválido ou sem permissões de acesso ao repositório.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("GITHUB_PAT");
    localStorage.removeItem("GEMINI_API_KEY");
    setIsAuthenticated(false);
    setDrafts([]);
    setActiveDraft(null);
    setEditorText("");
  };

  async function fetchDraftsList(authToken: string, targetRepo: string) {
    try {
      const branchRes = await fetch(`https://api.github.com/repos/${targetRepo}/branches/notes-drafts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (branchRes.status === 404) {
        const mainRes = await fetch(`https://api.github.com/repos/${targetRepo}/branches/main`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!mainRes.ok) throw new Error("Branch principal não encontrada.");
        const mainData = await mainRes.json();
        const sha = mainData.commit.sha;

        await fetch(`https://api.github.com/repos/${targetRepo}/git/refs`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "refs/heads/notes-drafts", sha }),
        });
      }

      const contentRes = await fetch(`https://api.github.com/repos/${targetRepo}/contents/src/content/drafts?ref=notes-drafts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (contentRes.status === 404) {
        setDrafts([]);
        return;
      }

      const files = await contentRes.json();
      if (Array.isArray(files)) {
        setDrafts(files.filter(f => f.name.endsWith(".mdx")));
      }
    } catch (err) {
      console.error("Erro ao carregar lista de rascunhos:", err);
    }
  };

  const handleCreateNewNote = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
    const initialContent = `# Novo Rascunho\n\nComece a formular sua nota aqui...\n\nSinta-se livre para incluir tabelas de markdown:\n\n| Parâmetro | Valor |\n|---|---|\n| Velocidade | 60 Hz |\n| Resolvedor | Verlet |`;

    try {
      setSyncStatus("syncing");
      const path = `src/content/drafts/${filename}.mdx`;
      
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `draft: inicializar rascunho ${filename}`,
          content: btoa(unescape(encodeURIComponent(initialContent))),
          branch: "notes-drafts",
        }),
      });

      if (!res.ok) throw new Error("Falha ao criar arquivo.");
      const data = await res.json();

      const newFile: DraftFile = {
        name: `${filename}.mdx`,
        path,
        sha: data.content.sha,
        content: initialContent,
      };

      setDrafts(prev => [newFile, ...prev]);
      handleSelectDraft(newFile);
      setSyncStatus("saved");
    } catch (err) {
      setSyncStatus("error");
    }
  };

  async function handleSelectDraft(file: DraftFile) {
    setActiveDraft(file);
    setSlug(file.name.replace(".mdx", ""));

    if (file.content !== undefined) {
      setEditorText(file.content);
      lastSavedTextRef.current = file.content;
      setHasUnsavedChanges(false);
      setSyncStatus("saved");
      return;
    }

    try {
      setSyncStatus("syncing");
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}?ref=notes-drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const decodedContent = decodeURIComponent(escape(atob(data.content)));

      const updatedFile = { ...file, content: decodedContent, sha: data.sha };
      setActiveDraft(updatedFile);
      setEditorText(decodedContent);
      lastSavedTextRef.current = decodedContent;
      setHasUnsavedChanges(false);
      setSyncStatus("saved");
    } catch (err) {
      setSyncStatus("error");
    }
  };

  const generateCommitMessage = async (diffText: string): Promise<string> => {
    if (!geminiKey) {
      return `draft: auto-sync at ${new Date().toLocaleString()}`;
    }

    try {
      const prompt = `Gere uma mensagem de commit de rascunho de apenas 1 linha em português para as modificações abaixo em uma postagem do meu blog de engenharia. Retorne apenas a mensagem bruta do commit de forma direta, sem aspas, preâmbulos, formatações de markdown ou explicações.
Modificações:
${diffText.slice(0, 1500)}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!res.ok) throw new Error();
      const data = await res.json();
      const msg = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return msg ? `draft: ${msg}` : `draft: auto-sync at ${new Date().toLocaleString()}`;
    } catch (err) {
      return `draft: auto-sync at ${new Date().toLocaleString()}`;
    }
  };

  const autoSyncToGitHub = async () => {
    if (!activeDraft) return;
    setSyncStatus("syncing");

    try {
      const isRename = `${slug}.mdx` !== activeDraft.name;
      const commitMsg = await generateCommitMessage(editorText);

      if (isRename) {
        const newName = `${slug}.mdx`;
        const newPath = `src/content/drafts/${newName}`;

        // 1. Write/Create the new file at src/content/drafts/${slug}.mdx
        const createRes = await fetch(`https://api.github.com/repos/${repo}/contents/${newPath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `rename: create ${newName}`,
            content: btoa(unescape(encodeURIComponent(editorText))),
            branch: "notes-drafts",
          }),
        });

        if (!createRes.ok) throw new Error("Failed to create new file during rename");
        const createData = await createRes.json();
        const newSha = createData.content.sha;

        // 2. Delete the old file at activeDraft.path using activeDraft.sha
        const deleteRes = await fetch(`https://api.github.com/repos/${repo}/contents/${activeDraft.path}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `rename: delete old file ${activeDraft.name}`,
            sha: activeDraft.sha,
            branch: "notes-drafts",
          }),
        });

        if (!deleteRes.ok) throw new Error("Failed to delete old file during rename");

        // 3. Update the local activeDraft state with the new path, name, and SHA
        const updatedDraft = {
          ...activeDraft,
          name: newName,
          path: newPath,
          sha: newSha,
          content: editorText,
        };
        setActiveDraft(updatedDraft);

        // 4. Update the local drafts state list to map the old file path to the new one
        setDrafts(prev => prev.map(d => d.path === activeDraft.path ? updatedDraft : d));

        // 5. Dispatch the custom "workspace-sync" event so the global Sidebar re-fetches and displays the renamed draft in real time!
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("workspace-sync"));
        }

        lastSavedTextRef.current = editorText;
        setHasUnsavedChanges(false);
        setSyncStatus("saved");
      } else {
        // Standard inline update as before
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${activeDraft.path}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: commitMsg,
            content: btoa(unescape(encodeURIComponent(editorText))),
            sha: activeDraft.sha,
            branch: "notes-drafts",
          }),
        });

        if (!res.ok) throw new Error();
        const data = await res.json();

        const updatedDraft = { ...activeDraft, content: editorText, sha: data.content.sha };
        setActiveDraft(updatedDraft);
        setDrafts(prev => prev.map(d => d.path === activeDraft.path ? updatedDraft : d));
        lastSavedTextRef.current = editorText;
        setHasUnsavedChanges(false);
        setSyncStatus("saved");
      }
    } catch (err) {
      setSyncStatus("error");
    }
  };

  const handlePublish = async () => {
    if (!activeDraft) return;
    setSyncStatus("syncing");

    try {
      const commitMsg = `feat(essay): publicar nota ${slug}`;
      const destPath = `src/content/essays/${slug}.mdx`;

      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${destPath}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: commitMsg,
          content: btoa(unescape(encodeURIComponent(editorText))),
          branch: "main",
        }),
      });

      if (!res.ok) throw new Error("Falha ao comitar na main.");

      await fetch(`https://api.github.com/repos/${repo}/contents/${activeDraft.path}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `chore: deletar rascunho publicado ${slug}`,
          sha: activeDraft.sha,
          branch: "notes-drafts",
        }),
      });

      setDrafts(prev => prev.filter(d => d.path !== activeDraft.path));
      setActiveDraft(null);
      setEditorText("");
      setSyncStatus("saved");
      alert("Sucesso! Nota publicada com sucesso na branch main. O deploy automático será engatilhado no GitHub Pages!");
    } catch (err) {
      setSyncStatus("error");
      alert("Erro ao publicar nota. Verifique se o seu token possui permissões de push na branch main.");
    }
  };

  // AI-Powered Translation Action
  const handleAITranslate = async () => {
    if (!geminiKey || !editorText) return;
    setAiLoading(true);

    try {
      const targetLang = isPt ? "inglês" : "português";
      const prompt = `Traduza o texto MDX abaixo perfeitamente para o ${targetLang}, preservando rigorosamente todas as equações matemáticas KaTeX ($...$ e $$...$$), todas as tags de componentes MDX (como <ComplexPlotter />, <NodeGraftViewer />, etc.) e todas as formatações estruturais originais. Retorne estritamente o conteúdo traduzido final de forma limpa, sem qualquer tipo de preâmbulo ou aspas explicativas.
MDX original:
${editorText}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!res.ok) throw new Error();
      const data = await res.json();
      const translated = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (translated) {
        handleEditorChange(translated.trim());
      }
    } catch (err) {
      alert("Falha na tradução da IA.");
    } finally {
      setAiLoading(false);
    }
  };

  // AI-Powered Slug Suggester Action
  const handleAISuggestSlug = async () => {
    if (!geminiKey || !editorText) return;
    setAiLoading(true);

    try {
      const prompt = `Analise o texto abaixo e sugira um "slug" (nome de arquivo SEO amigável, apenas minúsculas e hifens) ideal para esta postagem. Retorne estritamente apenas a string do slug de forma limpa, sem aspas, extensões ou qualquer texto adicional.
Texto:
${editorText.slice(0, 1000)}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!res.ok) throw new Error();
      const data = await res.json();
      const suggestedSlug = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
      if (suggestedSlug) {
        setSlug(suggestedSlug);
        alert(`IA sugeriu o slug: ${suggestedSlug}. Ele será aplicado no próximo salvamento.`);
      }
    } catch (err) {
      alert("Falha ao gerar sugestão de slug.");
    } finally {
      setAiLoading(false);
    }
  };

  // Custom Inline Prompt Assist Action
  const handleAICoprompt = async () => {
    if (!geminiKey || !editorText || !aiPrompt) return;
    setAiLoading(true);

    try {
      const prompt = `Você é um co-piloto de escrita técnica e matemática. O usuário solicitou o seguinte ajuste no texto: "${aiPrompt}".
Abaixo está o texto MDX completo. Modifique o texto aplicando o pedido do usuário da forma mais natural e elegante possível, mantendo toda a formatação MDX e fórmulas matemáticas. Retorne apenas o texto final modificado, sem explicações.
Texto original:
${editorText}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!res.ok) throw new Error();
      const data = await res.json();
      const updatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (updatedText) {
        handleEditorChange(updatedText.trim());
        setAiPrompt("");
      }
    } catch (err) {
      alert("Falha no co-pilotagem de IA.");
    } finally {
      setAiLoading(false);
    }
  };

  // Synchronize URL draft query parameter to load files dynamically from the Sidebar!
  useEffect(() => {
    if (urlDraft && drafts.length > 0) {
      const match = drafts.find((d) => d.name === urlDraft);
      if (match && activeDraft?.name !== urlDraft) {
        handleSelectDraft(match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDraft, drafts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const cachedToken = localStorage.getItem("GITHUB_PAT") || "";
    const cachedGemini = localStorage.getItem("GEMINI_API_KEY") || "";
    const cachedRepo = localStorage.getItem("WORKSPACE_REPO") || "racoci/racoci.github.io";

    if (cachedToken) {
      setToken(cachedToken);
      setGeminiKey(cachedGemini);
      setRepo(cachedRepo);
      setIsAuthenticated(true);
      fetchDraftsList(cachedToken, cachedRepo);
    }
  }, []);

  // Background Auto-Sync Engine: commit every 60 seconds if hasUnsavedChanges
  useEffect(() => {
    if (!isAuthenticated || !hasUnsavedChanges || !activeDraft) return;

    const interval = setInterval(() => {
      autoSyncToGitHub();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasUnsavedChanges, activeDraft, editorText]);

  const handleEditorChange = (val: string) => {
    setEditorText(val);
    if (val !== lastSavedTextRef.current) {
      setHasUnsavedChanges(true);
      setSyncStatus("unsaved");
    } else {
      setHasUnsavedChanges(false);
      setSyncStatus("saved");
    }
  };

  // Inline WYSIWYG block edit helpers
  const handleBlockChange = (idx: number, newVal: string) => {
    const blocks = editorText.split("\n\n");
    blocks[idx] = newVal;
    const jointText = blocks.join("\n\n");
    handleEditorChange(jointText);
  };

  if (!mounted) return null;

  // Render Login Card if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 font-sans">
              Central de Comando CMS
            </h2>
            <p className="text-xs text-zinc-400 font-serif">
              Faça login com seu GitHub PAT para acessar o painel de criação e edição.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                GitHub Token (PAT)
              </label>
              <input
                type="password"
                placeholder="ghp_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-[10px] text-zinc-400 block leading-relaxed mt-2 bg-zinc-950 p-3 rounded-xl border border-zinc-850/50">
                {isPt ? (
                  <>
                    💡 <strong>Como obter o seu PAT:</strong>
                    <ol className="list-decimal list-inside space-y-1 mt-1 text-[9px] text-zinc-500">
                      <li>Acesse as <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-bold">Configurações de Tokens de Grão Fino</a> do GitHub.</li>
                      <li>Clique em <strong>Generate new token</strong>.</li>
                      <li>Dê um nome ao token (ex: <code>blog-cms</code>) e em <strong>Repository access</strong> escolha <strong>Only select repositories</strong>, selecionando o repositório do seu portfólio.</li>
                      <li>Em <strong>Permissions</strong>, sob <strong>Repository permissions</strong>, selecione <strong>Contents</strong> e mude o nível para <strong>Read and Write</strong>.</li>
                      <li>Clique em <strong>Generate token</strong> e cole o código resultante acima!</li>
                    </ol>
                  </>
                ) : (
                  <>
                    💡 <strong>How to get your PAT:</strong>
                    <ol className="list-decimal list-inside space-y-1 mt-1 text-[9px] text-zinc-500">
                    <li>Go to GitHub&apos;s <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-bold">Fine-Grained Tokens Settings</a> page.</li>
                      <li>Click <strong>Generate new token</strong>.</li>
                      <li>Name your token (e.g., <code>blog-cms</code>) and under <strong>Repository access</strong> select <strong>Only select repositories</strong>, picking your portfolio repository.</li>
                      <li>In <strong>Permissions</strong>, under <strong>Repository permissions</strong>, select <strong>Contents</strong> and set access to <strong>Read and Write</strong>.</li>
                      <li>Click <strong>Generate token</strong> and copy-paste the resulting code above!</li>
                    </ol>
                  </>
                )}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                Google Gemini API Key (Opcional)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-[9px] text-zinc-500 block leading-relaxed mt-1">
                Utilizado para gerar mensagens de commit automatizadas de rascunhos. Pegue o seu gratuitamente em <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">aistudio.google.com</a>.
              </span>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 text-center font-mono">
                ⚠ {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer text-sm"
            >
              Autenticar e Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main flow-based container (Natural page scrolling!)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12">
      
      {/* CMS Workspace Top Bar */}
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 bg-zinc-900/80 backdrop-blur z-30 select-none">
        <div className="flex items-center gap-4 animate-fade-in">
          <Link href="/pt/projects" className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs flex items-center gap-1.5 font-bold">
            ← Voltar
          </Link>
          <div className="h-4 w-px bg-zinc-800"></div>
          <span className="font-extrabold tracking-tight text-sm uppercase text-zinc-300 font-mono">
            CMS Workspace Commander
          </span>
          <div className="h-4 w-px bg-zinc-800"></div>
          <button
            onClick={handleCreateNewNote}
            className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>+ Criar Rascunho</span>
          </button>
        </div>

        {/* Sync/Status indicators */}
        <div className="flex items-center gap-6">
          {/* Editor Mode Toggler */}
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 font-mono text-[10px]">
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === "split" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Tela Dividida (Código)
            </button>
            <button
              onClick={() => setViewMode("wysiwyg")}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === "wysiwyg" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Modo Visual (WYSIWYG)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              syncStatus === "saved" ? "bg-emerald-500" :
              syncStatus === "unsaved" ? "bg-yellow-500 animate-pulse" :
              syncStatus === "syncing" ? "bg-blue-500 animate-spin border border-t-transparent" :
              "bg-red-500 animate-pulse"
            }`} />
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-zinc-400">
              {syncStatus === "saved" && "Sincronizado"}
              {syncStatus === "unsaved" && "Salva em 1min"}
              {syncStatus === "syncing" && "Commitando..."}
              {syncStatus === "error" && "Erro de Rede"}
            </span>
          </div>

          <button
            onClick={() => autoSyncToGitHub()}
            disabled={!hasUnsavedChanges || syncStatus === "syncing"}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border font-mono select-none ${
              hasUnsavedChanges && syncStatus !== "syncing"
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400 cursor-pointer"
                : "bg-zinc-900 border-zinc-800/80 text-zinc-600 cursor-not-allowed"
            }`}
          >
            Salvar
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold rounded-lg transition-all text-red-400 cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main flow-based container (Natural page scrolling!) */}
      <div className="max-w-full w-full px-6 md:px-12 mt-8">
        {activeDraft ? (
          <div className="w-full space-y-6">
            
            {/* Elegant Document Slug Editor */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase block">
                  Identificador / URL da Nota (Slug)
                </span>
                <span className="text-xs text-zinc-400">
                  O slug define o nome do arquivo final e o caminho da URL do seu projeto.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:max-w-md bg-zinc-950 px-3 py-1.5 border border-zinc-800 rounded-xl focus-within:ring-1 focus-within:ring-emerald-500/50 focus-within:border-emerald-500/50 transition-all">
                <span className="text-xs font-mono text-zinc-600 shrink-0">essays/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    setSlug(sanitized);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="meu-novo-artigo"
                  className="w-full bg-transparent font-mono text-xs text-emerald-400 outline-none border-none focus:ring-0 p-0"
                />
                <span className="text-xs font-mono text-zinc-600 shrink-0">.mdx</span>
              </div>
            </div>

            {/* AI Co-pilot Tools Panel (Only visible if Gemini key configured) */}
            {geminiKey && (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    ✨ Gemini AI Assistant Co-pilot
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAITranslate}
                      disabled={aiLoading}
                      className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold rounded-lg text-emerald-400 transition-all cursor-pointer flex items-center gap-1"
                    >
                      🌐 {isPt ? "Traduzir nota" : "Translate draft"}
                    </button>
                    <button
                      onClick={handleAISuggestSlug}
                      disabled={aiLoading}
                      className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold rounded-lg text-blue-400 transition-all cursor-pointer flex items-center gap-1"
                    >
                      🏷️ Sugerir Slug / URL
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Melhore a explicação da seção III... / Formule fórmulas KaTeX..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAICoprompt}
                    disabled={aiLoading || !aiPrompt}
                    className="px-4 py-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shrink-0"
                  >
                    Instruir IA
                  </button>
                </div>
              </div>
            )}

            {/* Layout Mode Rendering */}
            {viewMode === "split" ? (
              /* --- SPLIT MODE (CODE + PREVIEW SIDE-BY-SIDE WITH DRAGGABLE DIVIDER) --- */
              <div ref={containerRef} className="flex flex-row items-stretch w-full border border-zinc-800/80 bg-zinc-900/10 rounded-2xl overflow-hidden shadow-2xl relative">
                
                {/* Code Editor */}
                <div style={{ width: `${splitWidth}%` }} className="flex flex-col bg-zinc-900/20 shrink-0">
                  <div className="h-10 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-zinc-900/40 font-mono text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Editando:</span>
                      <span className="text-emerald-400 font-bold">{activeDraft.name}</span>
                    </div>

                    <button
                      onClick={handlePublish}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-lg"
                    >
                      🚀 Publicar na Main
                    </button>
                  </div>

                  <div className="relative flex-1 w-full flex flex-col">
                    <textarea
                      ref={mainTextareaRef}
                      value={editorText}
                      onChange={(e) => handleEditorChange(e.target.value)}
                      onKeyUp={(e) => checkMainAutocomplete(e.currentTarget)}
                      onClick={(e) => checkMainAutocomplete(e.currentTarget)}
                      onKeyDown={(e) => {
                        if (mainAutocomplete.isOpen && mainFilteredSuggestions.length > 0) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setMainAutocomplete((prev) => ({
                              ...prev,
                              selectedIndex: (prev.selectedIndex + 1) % mainFilteredSuggestions.length,
                            }));
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setMainAutocomplete((prev) => ({
                              ...prev,
                              selectedIndex: (prev.selectedIndex - 1 + mainFilteredSuggestions.length) % mainFilteredSuggestions.length,
                            }));
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSelectMainSuggestion(mainFilteredSuggestions[mainAutocomplete.selectedIndex]);
                            return;
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setMainAutocomplete((prev) => ({ ...prev, isOpen: false }));
                            return;
                          }
                        }
                      }}
                      className="flex-1 w-full min-h-[600px] p-6 bg-zinc-950 text-zinc-100 font-mono text-sm leading-relaxed outline-none border-none resize-none selection:bg-emerald-500/10 focus:ring-0"
                      spellCheck="false"
                    />

                    {/* Autocomplete Overlay */}
                    {mainAutocomplete.isOpen && mainFilteredSuggestions.length > 0 && (
                      <div
                        className="absolute z-50 bg-zinc-900/95 border border-zinc-800/80 rounded-xl shadow-2xl p-1.5 max-w-xs min-w-[220px] font-mono text-xs select-none backdrop-blur animate-fade-in animate-duration-150"
                        style={{
                          top: `${mainAutocomplete.top}px`,
                          left: `${mainAutocomplete.left}px`,
                        }}
                      >
                        <div className="px-2 py-1 text-[9px] font-bold tracking-widest text-zinc-500 border-b border-zinc-800 mb-1 uppercase">
                          Componentes Disponíveis
                        </div>
                        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                          {mainFilteredSuggestions.map((widget, idx) => {
                            const isSelected = idx === mainAutocomplete.selectedIndex;
                            return (
                              <div
                                key={widget}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectMainSuggestion(widget);
                                }}
                                onMouseEnter={() => setMainAutocomplete(prev => ({ ...prev, selectedIndex: idx }))}
                                className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                                  isSelected
                                    ? "bg-emerald-500/20 text-emerald-400 font-extrabold shadow-sm"
                                    : "text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100"
                                }`}
                              >
                                <span>{widget}</span>
                                {isSelected && <span className="text-[9px] bg-emerald-500/30 text-emerald-400 px-1 py-0.5 rounded font-bold">↵ ENTER</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Draggable Column Resizer */}
                <div
                  onMouseDown={handleMouseDown}
                  className="w-1.5 hover:bg-emerald-500/50 bg-zinc-800 cursor-col-resize transition-colors h-stretch select-none shrink-0 border-r border-l border-zinc-950"
                  title="Arraste para redimensionar painéis"
                />

                {/* Symmetrical Live Preview with Inline Click-to-Edit */}
                <div style={{ width: `${100 - splitWidth}%` }} className="p-6 space-y-4 overflow-y-visible">
                  <div className="border-b border-zinc-800 pb-2 mb-4 flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase block">
                      Live Rich Preview (Clique em qualquer bloco para editar!)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-500">
                      Slug: {slug}
                    </span>
                  </div>

                  <div className="prose dark:prose-invert prose-emerald max-w-none text-zinc-300 font-serif leading-relaxed text-sm md:text-base space-y-2">
                    {editorText.split("\n\n").map((blockText, blockIdx) => {
                      const isEditingThisBlock = editingBlockIndex === blockIdx;

                      if (isEditingThisBlock) {
                        return (
                          <div key={blockIdx} className="my-4 border border-emerald-500/40 bg-zinc-950 p-4 rounded-xl flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                            <AutosizingBlockTextarea
                              defaultValue={blockText}
                              onSave={(val) => {
                                handleBlockChange(blockIdx, val);
                                setEditingBlockIndex(null);
                              }}
                              onCancel={() => setEditingBlockIndex(null)}
                              className="w-full p-2 bg-zinc-950 text-zinc-100 font-mono text-sm leading-relaxed outline-none border-none resize-none overflow-hidden"
                            />
                            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 px-1">
                              <span>Pressione <kbd className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400">Shift + Enter</kbd> ou clique fora para compilar</span>
                              <span className="uppercase text-emerald-500 font-bold">Editando Bloco</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={blockIdx}
                          onClick={() => setEditingBlockIndex(blockIdx)}
                          className="group relative p-2 -mx-2 hover:bg-zinc-900/30 rounded-xl transition-all cursor-text"
                          title="Clique para editar este bloco"
                        >
                          {/* Hover Edit Icon */}
                          <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 border border-zinc-800 text-[9px] text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold select-none uppercase tracking-widest">
                            Editar Bloco
                          </div>

                          <BlockContentRenderer
                            text={blockText}
                            onBlockUpdate={(newText) => handleBlockChange(blockIdx, newText)}
                            lang={lang}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              /* --- WYSIWYG SINGLE-PANE MODE (NOTION-LIKE BLOCK EDITOR) --- */
              <div className="w-full border border-zinc-800 bg-zinc-900/10 p-8 rounded-2xl shadow-2xl relative space-y-4">
                
                <div className="border-b border-zinc-800 pb-3 mb-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                      Modo Editor Único (Visual)
                    </span>
                    <h2 className="text-sm font-mono text-zinc-400">
                      Slug do arquivo: <code className="text-emerald-400">{slug}.mdx</code>
                    </h2>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePublish}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
                    >
                      🚀 Publicar nota na Main
                    </button>
                  </div>
                </div>

                <div className="prose dark:prose-invert prose-emerald max-w-none text-zinc-300 font-serif leading-relaxed text-sm md:text-base space-y-2">
                  {editorText.split("\n\n").map((blockText, blockIdx) => {
                    const isEditingThisBlock = editingBlockIndex === blockIdx;

                    if (isEditingThisBlock) {
                      return (
                        <div key={blockIdx} className="my-4 border border-emerald-500/40 bg-zinc-950 p-4 rounded-xl flex flex-col gap-2">
                          <AutosizingBlockTextarea
                            defaultValue={blockText}
                            onSave={(val) => {
                              handleBlockChange(blockIdx, val);
                              setEditingBlockIndex(null);
                            }}
                            onCancel={() => setEditingBlockIndex(null)}
                            className="w-full p-2 bg-zinc-950 text-zinc-100 font-mono text-sm leading-relaxed outline-none border-none resize-none overflow-hidden"
                          />
                          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 px-1">
                            <span>Pressione <kbd className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400">Shift + Enter</kbd> ou clique fora para compilar</span>
                            <span className="uppercase text-emerald-500 font-bold">Editando Bloco</span>
                          </div>
                        </div>
                      );
                    }

                    // Render block visually with edit click handler
                    return (
                      <div
                        key={blockIdx}
                        onClick={() => setEditingBlockIndex(blockIdx)}
                        className="group relative my-4 p-2 -mx-2 hover:bg-zinc-900/30 rounded-xl transition-all cursor-text"
                        title="Clique para editar este bloco"
                      >
                        {/* Hover Edit Icon */}
                        <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 border border-zinc-800 text-[9px] text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold select-none uppercase tracking-widest">
                          Editar Bloco
                        </div>

                        <BlockContentRenderer
                          text={blockText}
                          onBlockUpdate={(newText) => handleBlockChange(blockIdx, newText)}
                          lang={lang}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full border border-zinc-800 bg-zinc-900/10 p-12 rounded-2xl text-zinc-500 font-serif italic text-center min-h-[400px] flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 border border-dashed border-zinc-800 rounded-full flex items-center justify-center mb-4 text-2xl not-italic bg-zinc-900/50">
              ✍
            </div>
            {isPt 
              ? "Selecione um rascunho de nota na barra lateral esquerda do jardim digital para começar a escrever!" 
              : "Select a draft note from the left digital garden sidebar to start writing!"}
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleCreateNewNote}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg"
              >
                + {isPt ? "Criar Novo Rascunho" : "Create New Draft"}
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default function WorkspacePage(props: PageProps) {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    }>
      <WorkspaceDashboard {...props} />
    </React.Suspense>
  );
}
