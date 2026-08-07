"use client";

import React, { useState, useEffect, useRef } from "react";

interface BlockReason {
  num: number;
  type: "row" | "col" | "box";
  blockRow: number;
  blockCol: number;
}

interface NakedSingleHint {
  cellIdx: number;
  val: number;
  reasons: BlockReason[];
}

interface SectorMissingInfo {
  name: string;
  missing: number[];
}

interface SudokuViewerProps {
  lang: "en" | "pt";
}

// -------------------------------------------------------------
// SUDOKU CORE MATHEMATICAL UTILITIES (Solver & Generator)
// -------------------------------------------------------------

function isValidPlacement(board: number[], idx: number, num: number): boolean {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let c = 0; c < 9; c++) {
    if (board[row * 9 + c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (board[r * 9 + col] === num) return false;
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[(boxRow + r) * 9 + (boxCol + c)] === num) return false;
    }
  }
  return true;
}

function fillBoard(board: number[]): boolean {
  const emptyIdx = board.indexOf(0);
  if (emptyIdx === -1) return true;

  const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const num of candidates) {
    if (isValidPlacement(board, emptyIdx, num)) {
      board[emptyIdx] = num;
      if (fillBoard(board)) return true;
      board[emptyIdx] = 0;
    }
  }
  return false;
}

function getCandidates(board: number[], idx: number): number[] {
  if (board[idx] !== 0) return [];
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  const used = new Set<number>();
  for (let c = 0; c < 9; c++) {
    const val = board[row * 9 + c];
    if (val !== 0) used.add(val);
  }
  for (let r = 0; r < 9; r++) {
    const val = board[r * 9 + col];
    if (val !== 0) used.add(val);
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const val = board[(boxRow + r) * 9 + (boxCol + c)];
      if (val !== 0) used.add(val);
    }
  }

  const res: number[] = [];
  for (let n = 1; n <= 9; n++) {
    if (!used.has(n)) res.push(n);
  }
  return res;
}

function generatePuzzle(difficulty: "easy" | "medium" | "hard"): {
  puzzle: number[];
  solution: number[];
} {
  const board = Array(81).fill(0);
  fillBoard(board);
  const solution = [...board];

  const targetGivens = difficulty === "easy" ? 45 : difficulty === "medium" ? 35 : 26;
  const puzzle = [...board];

  const indices = Array.from({ length: 81 }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const toRemove = 81 - targetGivens;
  for (let i = 0; i < toRemove; i++) {
    puzzle[indices[i]] = 0;
  }

  return { puzzle, solution };
}

function findNextNakedSingle(board: number[]): NakedSingleHint | null {
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) continue;
    const candidates = getCandidates(board, i);
    if (candidates.length === 1) {
      const val = candidates[0];
      const reasons: BlockReason[] = [];
      const row = Math.floor(i / 9);
      const col = i % 9;
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;

      for (let n = 1; n <= 9; n++) {
        if (n === val) continue;

        let blocked = false;
        // Row check
        for (let c = 0; c < 9; c++) {
          if (board[row * 9 + c] === n) {
            reasons.push({ num: n, type: "row", blockRow: row, blockCol: c });
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        // Column check
        for (let r = 0; r < 9; r++) {
          if (board[r * 9 + col] === n) {
            reasons.push({ num: n, type: "col", blockRow: r, blockCol: col });
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        // Box check
        for (let r = 0; r < 3; r++) {
          let found = false;
          for (let c = 0; c < 3; c++) {
            const br = boxRow + r;
            const bc = boxCol + c;
            if (board[br * 9 + bc] === n) {
              reasons.push({ num: n, type: "box", blockRow: br, blockCol: bc });
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      return { cellIdx: i, val, reasons };
    }
  }
  return null;
}

// HSL hue coding mapper: equidistant HSL hue
function getNumColor(n: number, isDark = false) {
  const hue = (n - 1) * 40;
  return isDark ? `hsl(${hue}, 80%, 65%)` : `hsl(${hue}, 75%, 42%)`;
}

function getNumBgColor(n: number, isDark = false) {
  const hue = (n - 1) * 40;
  return isDark ? `hsla(${hue}, 80%, 65%, 0.15)` : `hsla(${hue}, 75%, 42%, 0.1)`;
}

// -------------------------------------------------------------
// COMPONENT DEFINITION
// -------------------------------------------------------------

export default function SudokuViewer({ lang }: SudokuViewerProps) {
  const isPt = lang === "pt";

  const dict = {
    en: {
      title: "Sudoku Mentor Panel",
      subtitle: "Learn advanced mathematics and logical deduction interactively.",
      difficulty: "Difficulty",
      easy: "Easy (45 clues)",
      medium: "Medium (35 clues)",
      hard: "Hard (26 clues)",
      newGameBtn: "Generate New Board",
      resetBtn: "Reset Current Board",
      findSingleBtn: "💡 Find Next Naked Single",
      sectorHeader: "Sector Selection Tools",
      selectRow: "Select Row",
      selectCol: "Select Col",
      selectBox: "Select Box",
      keyboardTip: "Press 1-9 on keyboard to enter values, Backspace/Delete to clear.",
      ctrlTip: "Hold Ctrl to select multiple cells.",
      missingHeader: "Sector Assistant (Remaining Candidates)",
      missingNone: "No sectors with ≤ 4 missing candidates are currently selected.",
      nakedSubsetBtn: "🔍 Highlight Naked Subsets",
      nakedSubsetTitle: "Naked Subsets Highlighted!",
      nakedSubsetDesc: "Cells highlighted with unique colors form a closed set where the union of candidates exactly matches the set size.",
      hintHeader: "Logical Tutor Explanation",
      hintEmpty: "Click 'Find Next Naked Single' to reveal logical step-by-step tutors.",
      hintNakedSingleTitle: "Naked Single Discovered!",
      hintNakedSingleDesc: "An empty cell has exactly ONE mathematically possible number left.",
      reasonsTitle: "Step-by-step Constraint Pruning:",
      explainBlocked: "Number {num} is blocked by value in cell at Row {row}, Column {col} (matching {type}).",
      explainBlockedBox: "Number {num} is blocked by value in cell at Row {row}, Column {col} (inside the same 3x3 box).",
      explainValid: "Thus, the only valid option left for this cell is exactly {val}.",
      correctCell: "Matches unique solved board!",
      wrongCell: "Mismatches unique solution board! (Keep practicing)",
      conflictsTitle: "Immediate Violations Detected:",
      conflictMsg: "Conflict found! Digits are duplicated in Row, Column, or Box.",
      wellDone: "🎉 Perfect! You successfully solved the Sudoku Mentor board!",
      errorsInBoard: "⚠️ Board contains error inputs. Correct them to find naked singles.",
      noNakedSingleFound: "No Naked Singles found. Try filling more cells or search for advanced patterns!",
      numPadClear: "Clear",
    },
    pt: {
      title: "Painel do Mentor de Sudoku",
      subtitle: "Aprenda matemática avançada e dedução lógica de forma interativa.",
      difficulty: "Dificuldade",
      easy: "Fácil (45 pistas)",
      medium: "Médio (35 pistas)",
      hard: "Difícil (26 pistas)",
      newGameBtn: "Gerar Novo Tabuleiro",
      resetBtn: "Reiniciar Tabuleiro",
      findSingleBtn: "💡 Buscar Próximo Naked Single",
      sectorHeader: "Ferramentas de Seleção de Setores",
      selectRow: "Selecionar Linha",
      selectCol: "Selecionar Col",
      selectBox: "Selecionar Bloco",
      keyboardTip: "Pressione 1-9 no teclado para preencher, Backspace/Delete para apagar.",
      ctrlTip: "Segure Ctrl para selecionar múltiplas células.",
      missingHeader: "Assistente de Setores (Candidatos Restantes)",
      missingNone: "Nenhum setor com ≤ 4 candidatos ausentes selecionado.",
      nakedSubsetBtn: "🔍 Destacar Subconjuntos (Naked Subsets)",
      nakedSubsetTitle: "Naked Subsets Destacados!",
      nakedSubsetDesc: "Células com cores de fundo únicas formam um conjunto fechado onde a união das possibilidades tem exatamente o tamanho do conjunto.",
      hintHeader: "Explicação do Tutor Lógico",
      hintEmpty: "Clique em 'Buscar Próximo Naked Single' para revelar explicações lógicas passo a passo.",
      hintNakedSingleTitle: "Naked Single Encontrado!",
      hintNakedSingleDesc: "Uma célula vazia possui exatamente UMA possibilidade matemática restante.",
      reasonsTitle: "Poda de Restrições Passo a Passo:",
      explainBlocked: "O número {num} está bloqueado pelo valor na Linha {row}, Coluna {col} (mesma {type}).",
      explainBlockedBox: "O número {num} está bloqueado pelo valor na Linha {row}, Coluna {col} (dentro do mesmo bloco 3x3).",
      explainValid: "Portanto, a única opção matematicamente válida restante é exatamente {val}.",
      correctCell: "Corresponde ao tabuleiro resolvido!",
      wrongCell: "Incorreto frente à solução única! (Continue tentando)",
      conflictsTitle: "Violações imediatas detectadas:",
      conflictMsg: "Conflito encontrado! Dígitos duplicados na Linha, Coluna ou Bloco.",
      wellDone: "🎉 Perfeito! Você resolveu com sucesso o tabuleiro do Mentor de Sudoku!",
      errorsInBoard: "⚠️ O tabuleiro possui erros. Corrija-os para encontrar Naked Singles.",
      noNakedSingleFound: "Nenhum Naked Single encontrado. Tente preencher outras células ou buscar padrões avançados!",
      numPadClear: "Limpar",
    },
  };

  const t = isPt ? dict.pt : dict.en;

  // State
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [board, setBoard] = useState<number[]>(Array(81).fill(0));
  const [initialBoard, setInitialBoard] = useState<number[]>(Array(81).fill(0));
  const [solution, setSolution] = useState<number[]>(Array(81).fill(0));
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [hoveredCellIdx, setHoveredCellIdx] = useState<number | null>(null);
  const [hoveredCellNum, setHoveredCellNum] = useState<number | null>(null);
  const [hint, setHint] = useState<NakedSingleHint | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Guard state to defer inline styles until mounted (prevents Dark Reader hydration mismatch)
  const [isMounted, setIsMounted] = useState(false);
  
  // New state for long-press pencil marks
  const [longPressCellIdx, setLongPressCellIdx] = useState<number | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (idx: number) => {
    pressTimer.current = setTimeout(() => {
      setLongPressCellIdx(idx);
    }, 400); // 400ms for long press
  };

  const endLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setLongPressCellIdx(null);
  };

  // Initialize game on mount
  useEffect(() => {
    // Detect dark mode in NextJS document
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Watch dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDarkMode(document.documentElement.classList.contains("dark"));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    startNewGame("easy");
    setIsMounted(true);

    return () => observer.disconnect();
  }, []);

  const startNewGame = (diff = difficulty) => {
    const { puzzle, solution: sol } = generatePuzzle(diff);
    setBoard(puzzle);
    setInitialBoard([...puzzle]);
    setSolution(sol);
    setSelectedIndices([]);
    setHint(null);
    setHintMessage(null);
  };

  const resetCurrentBoard = () => {
    setBoard([...initialBoard]);
    setSelectedIndices([]);
    setHint(null);
    setHintMessage(null);
  };

  // Check if board has conflicts (duplicates in rows/cols/boxes)
  const hasConflicts = () => {
    // Check rows
    for (let r = 0; r < 9; r++) {
      const rowVals = new Set<number>();
      for (let c = 0; c < 9; c++) {
        const val = board[r * 9 + c];
        if (val !== 0) {
          if (rowVals.has(val)) return true;
          rowVals.add(val);
        }
      }
    }
    // Check cols
    for (let c = 0; c < 9; c++) {
      const colVals = new Set<number>();
      for (let r = 0; r < 9; r++) {
        const val = board[r * 9 + c];
        if (val !== 0) {
          if (colVals.has(val)) return true;
          colVals.add(val);
        }
      }
    }
    // Check boxes
    for (let b = 0; b < 9; b++) {
      const boxVals = new Set<number>();
      const boxRow = Math.floor(b / 3) * 3;
      const boxCol = (b % 3) * 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const val = board[(boxRow + r) * 9 + (boxCol + c)];
          if (val !== 0) {
            if (boxVals.has(val)) return true;
            boxVals.add(val);
          }
        }
      }
    }
    return false;
  };

  const isSolved = () => {
    if (board.includes(0)) return false;
    for (let i = 0; i < 81; i++) {
      if (board[i] !== solution[i]) return false;
    }
    return true;
  };

  // Keyboard navigation & inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndices.length === 0) return;

      // Handle clearing
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        e.preventDefault();
        setBoard((prev) => {
          const next = [...prev];
          selectedIndices.forEach((idx) => {
            if (initialBoard[idx] === 0) {
              next[idx] = 0;
            }
          });
          return next;
        });
        setHint(null);
        return;
      }

      // Handle number placement
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        setBoard((prev) => {
          const next = [...prev];
          selectedIndices.forEach((idx) => {
            if (initialBoard[idx] === 0) {
              next[idx] = num;
            }
          });
          return next;
        });
        setHint(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndices, initialBoard]);

  // Click handler with multi-select support (Ctrl key)
  const handleCellClick = (idx: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIndices((prev) => {
        if (prev.includes(idx)) {
          return prev.filter((i) => i !== idx);
        } else {
          return [...prev, idx];
        }
      });
    } else {
      setSelectedIndices([idx]);
    }
  };

  // Sector selectors
  const selectRow = (rowIdx: number) => {
    const indices = Array.from({ length: 9 }, (_, c) => rowIdx * 9 + c);
    setSelectedIndices(indices);
    setHint(null);
  };

  const selectCol = (colIdx: number) => {
    const indices = Array.from({ length: 9 }, (_, r) => r * 9 + colIdx);
    setSelectedIndices(indices);
    setHint(null);
  };

  const selectBox = (boxIdx: number) => {
    const boxRow = Math.floor(boxIdx / 3) * 3;
    const boxCol = (boxIdx % 3) * 3;
    const indices: number[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        indices.push((boxRow + r) * 9 + (boxCol + c));
      }
    }
    setSelectedIndices(indices);
    setHint(null);
  };

  // Find Naked Single Hint
  const handleFindNakedSingle = () => {
    if (hasConflicts()) {
      setHint(null);
      setHintMessage(t.errorsInBoard);
      return;
    }

    const found = findNextNakedSingle(board);
    if (found) {
      setHint(found);
      setHintMessage(null);
      setSelectedIndices([found.cellIdx]);
    } else {
      setHint(null);
      setHintMessage(t.noNakedSingleFound);
    }
  };

  // Sector assistance: calculate missing candidates for selected sector
  // Supports dynamic tracking of rows, cols, boxes for selected sector or active cell
  const getSectorsMissingInfo = (): SectorMissingInfo[] => {
    if (selectedIndices.length === 0) return [];

    // If exactly a complete row/col/box is selected, analyze that sector specifically.
    // Otherwise, dynamically track the sectors of the last selected cell.
    const lastSelectedIdx = selectedIndices[selectedIndices.length - 1];
    const row = Math.floor(lastSelectedIdx / 9);
    const col = lastSelectedIdx % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    const sectors: { name: { en: string; pt: string }; indices: number[] }[] = [
      {
        name: { en: `Row ${row + 1}`, pt: `Linha ${row + 1}` },
        indices: Array.from({ length: 9 }, (_, c) => row * 9 + c),
      },
      {
        name: { en: `Column ${col + 1}`, pt: `Coluna ${col + 1}` },
        indices: Array.from({ length: 9 }, (_, r) => r * 9 + col),
      },
      {
        name: { en: `Box ${boxIdx + 1}`, pt: `Bloco ${boxIdx + 1}` },
        indices: [],
      },
    ];

    // Populate box indices
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        sectors[2].indices.push((boxRow + r) * 9 + (boxCol + c));
      }
    }

    const result: SectorMissingInfo[] = [];

    sectors.forEach((sec) => {
      const present = new Set<number>();
      sec.indices.forEach((idx) => {
        if (board[idx] !== 0) present.add(board[idx]);
      });

      const missing: number[] = [];
      for (let n = 1; n <= 9; n++) {
        if (!present.has(n)) missing.push(n);
      }

      if (missing.length > 0 && missing.length <= 4) {
        result.push({
          name: isPt ? sec.name.pt : sec.name.en,
          missing,
        });
      }
    });

    return result;
  };

  const sectorMissingList = getSectorsMissingInfo();

  // Helper for crosshair display:
  // Draws constraints row & column lines from last selected cell containing a number, except inside its own box.
  const activeSelectedIdx = selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : null;
  const activeSelectedVal = activeSelectedIdx !== null ? board[activeSelectedIdx] : 0;
  const hasCrosshair = activeSelectedIdx !== null && activeSelectedVal !== 0;

  const getCrosshairInfo = () => {
    if (activeSelectedIdx === null) return null;
    const row = Math.floor(activeSelectedIdx / 9);
    const col = activeSelectedIdx % 9;
    return {
      row,
      col,
      boxRow: Math.floor(row / 3) * 3,
      boxCol: Math.floor(col / 3) * 3,
    };
  };
  const ch = getCrosshairInfo();

  const isCrosshairCell = (idx: number) => {
    if (!hasCrosshair || !ch) return false;
    const r = Math.floor(idx / 9);
    const c = idx % 9;

    // Extend across rows and columns except inside the active cell's 3x3 box
    const inSameBox = Math.floor(r / 3) * 3 === ch.boxRow && Math.floor(c / 3) * 3 === ch.boxCol;
    return (r === ch.row || c === ch.col) && !inSameBox;
  };

  // Virtual Numpad placement for mobile users
  const handleNumPadInput = (num: number) => {
    if (selectedIndices.length === 0) return;
    setBoard((prev) => {
      const next = [...prev];
      selectedIndices.forEach((idx) => {
        if (initialBoard[idx] === 0) {
          next[idx] = num;
        }
      });
      return next;
    });
    setHint(null);
  };

  // Compute Combined Possibilities (Bitwise OR of candidates) for Selection Widget
  const getCombinedPossibilities = (): number[] => {
    if (selectedIndices.length === 0) return [];
    
    let combinedBitset = 0;
    selectedIndices.forEach((idx) => {
      if (board[idx] === 0) {
        const cands = getCandidates(board, idx);
        cands.forEach((c) => {
          combinedBitset |= (1 << c);
        });
      }
    });

    const res: number[] = [];
    for (let n = 1; n <= 9; n++) {
      if ((combinedBitset & (1 << n)) !== 0) res.push(n);
    }
    return res;
  };

  const combinedPossibilities = getCombinedPossibilities();

  // Highlight Naked Subsets Algorithm
  const [highlightedSubsetCells, setHighlightedSubsetCells] = useState<number[]>([]);
  
  const highlightNakedSubsets = () => {
    if (hasConflicts()) {
      setHintMessage(t.errorsInBoard);
      return;
    }

    setHighlightedSubsetCells([]); // reset

    // We search through every region (row, col, box)
    const regions: number[][] = [];
    // Rows
    for (let r = 0; r < 9; r++) regions.push(Array.from({length: 9}, (_, c) => r * 9 + c));
    // Cols
    for (let c = 0; c < 9; c++) regions.push(Array.from({length: 9}, (_, r) => r * 9 + c));
    // Boxes
    for (let b = 0; b < 9; b++) {
      const bRow = Math.floor(b / 3) * 3;
      const bCol = (b % 3) * 3;
      const box: number[] = [];
      for(let r=0; r<3; r++) for(let c=0; c<3; c++) box.push((bRow+r)*9 + (bCol+c));
      regions.push(box);
    }

    let foundCells: number[] = [];
    
    for (const region of regions) {
      // Find empty cells and their candidate bitsets
      const emptyCells = region.filter(idx => board[idx] === 0);
      if (emptyCells.length === 0) continue;

      const candidatesMap = emptyCells.map(idx => {
        let bitset = 0;
        getCandidates(board, idx).forEach(c => bitset |= (1 << c));
        return { idx, bitset };
      });

      // Check for subsets of size N (2, 3, or 4)
      for (let N = 2; N <= Math.min(4, emptyCells.length - 1); N++) {
        // Combination generator
        const getCombinations = (arr: typeof candidatesMap, k: number) => {
          const result: (typeof candidatesMap)[] = [];
          const f = (prefix: typeof candidatesMap, elements: typeof candidatesMap) => {
            if (prefix.length === k) {
              result.push(prefix);
              return;
            }
            for (let i = 0; i < elements.length; i++) {
              f([...prefix, elements[i]], elements.slice(i + 1));
            }
          };
          f([], arr);
          return result;
        };

        const combs = getCombinations(candidatesMap, N);
        for (const comb of combs) {
          let unionBitset = 0;
          comb.forEach(c => unionBitset |= c.bitset);
          
          let count = 0;
          for (let n = 1; n <= 9; n++) {
            if ((unionBitset & (1 << n)) !== 0) count++;
          }

          if (count === N) {
            // Naked subset found!
            foundCells = comb.map(c => c.idx);
            break; 
          }
        }
        if (foundCells.length > 0) break;
      }
      if (foundCells.length > 0) break;
    }

    if (foundCells.length > 0) {
      setHighlightedSubsetCells(foundCells);
      setHintMessage(t.nakedSubsetTitle + " " + t.nakedSubsetDesc);
      setSelectedIndices([]);
    } else {
      setHintMessage(t.noNakedSingleFound);
    }
  };

  const handleNumPadClear = () => {
    if (selectedIndices.length === 0) return;
    setBoard((prev) => {
      const next = [...prev];
      selectedIndices.forEach((idx) => {
        if (initialBoard[idx] === 0) {
          next[idx] = 0;
        }
      });
      return next;
    });
    setHint(null);
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT SECTION: Main Grid and Primary Board Controls */}
      <div className="lg:col-span-7 flex flex-col items-center space-y-6">
        {/* Top Control Panel */}
        <div className="w-full flex flex-wrap gap-4 items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
              {t.difficulty}:
            </span>
            <select
              value={difficulty}
              onChange={(e) => {
                const val = e.target.value as "easy" | "medium" | "hard";
                setDifficulty(val);
                startNewGame(val);
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="easy">{t.easy}</option>
              <option value="medium">{t.medium}</option>
              <option value="hard">{t.hard}</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => resetCurrentBoard()}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              {t.resetBtn}
            </button>
            <button
              onClick={() => startNewGame()}
              className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold rounded-lg hover:shadow transition-all"
            >
              {t.newGameBtn}
            </button>
          </div>
        </div>

        {/* Main Board Wrapper with a solid bounded width to prevent Flexbox collapse */}
        <div className="w-full max-w-[480px] flex flex-col select-none">
          
          {/* Top Column Selectors */}
          <div className="w-full grid grid-cols-[32px_1fr] mb-1.5">
            <div className="w-8"></div> {/* Corner spacer matching Row Selectors width */}
            <div className="grid grid-cols-9 gap-1 text-center">
              {Array.from({ length: 9 }, (_, c) => (
                <button
                  key={c}
                  onClick={() => selectCol(c)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-emerald-500 hover:font-bold transition-all pb-0.5"
                >
                  C{c + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full flex items-stretch gap-2">
            {/* Left Row Selectors */}
            <div className="w-8 flex flex-col justify-between py-1">
              {Array.from({ length: 9 }, (_, r) => (
                <button
                  key={r}
                  onClick={() => selectRow(r)}
                  className="flex-1 text-[10px] font-mono text-zinc-400 hover:text-emerald-500 hover:font-bold transition-all flex items-center justify-end pr-2"
                >
                  R{r + 1}
                </button>
              ))}
            </div>

            {/* The 9x9 Sudoku Grid (3x3 of 3x3s) */}
            <div className="flex-1 aspect-square bg-zinc-200/50 dark:bg-zinc-800/50 border-[3px] border-zinc-900 dark:border-zinc-300 p-1 rounded-xl overflow-hidden shadow-2xl grid grid-cols-3 grid-rows-3 gap-1.5">
              {isSolved() && (
                <div className="absolute inset-0 z-30 bg-emerald-950/90 flex flex-col items-center justify-center text-center p-6 space-y-4 animate-fade-in">
                  <span className="text-4xl animate-bounce">🏆</span>
                  <h3 className="text-2xl font-extrabold text-emerald-400 font-sans tracking-tight">
                    {isPt ? "Sudoku Resolvido!" : "Sudoku Concluded!"}
                  </h3>
                  <p className="text-emerald-100 font-serif leading-relaxed text-sm max-w-sm">
                    {t.wellDone}
                  </p>
                  <button
                    onClick={() => startNewGame()}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    {t.newGameBtn}
                  </button>
                </div>
              )}

              {Array.from({ length: 9 }, (_, boxIdx) => {
                const boxRow = Math.floor(boxIdx / 3) * 3;
                const boxCol = (boxIdx % 3) * 3;
                
                // Get the list of 9 cells belonging to this box
                const cells: number[] = [];
                for (let r = 0; r < 3; r++) {
                  for (let c = 0; c < 3; c++) {
                    cells.push((boxRow + r) * 9 + (boxCol + c));
                  }
                }

                return (
                  <div
                    key={boxIdx}
                    className="grid grid-cols-3 grid-rows-3 bg-white dark:bg-zinc-950 outline outline-1 outline-zinc-900 dark:outline-zinc-300 hover:outline-emerald-500 cursor-pointer transition-all rounded-md overflow-hidden"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) selectBox(boxIdx);
                    }}
                  >
                    {cells.map((idx) => {
                      const r = Math.floor(idx / 9);
                      const c = idx % 9;
                      
                      const cellValue = board[idx];
                      const isGiven = initialBoard[idx] !== 0;
                      const isSelected = selectedIndices.includes(idx);
                      const isHovered = hoveredCellIdx === idx;
                      const isLongPressed = longPressCellIdx === idx;
                      const isHint = hint?.cellIdx === idx;
                      const isCrosshair = isCrosshairCell(idx);
                      const isHighlightedSubset = highlightedSubsetCells.includes(idx);

                      // Draw borders inside the 3x3 block
                      const borderTop = (r % 3) !== 0 ? "border-t border-t-zinc-100 dark:border-t-zinc-900/60" : "";
                      const borderLeft = (c % 3) !== 0 ? "border-l border-l-zinc-100 dark:border-l-zinc-900/60" : "";

                      const isMatchHover = cellValue !== 0 && hoveredCellNum === cellValue;

                      const customColor = cellValue !== 0 ? getNumColor(cellValue, isDarkMode) : "";
                      const customBg = cellValue !== 0 ? getNumBgColor(cellValue, isDarkMode) : "";
                      
                      // Naked subset distinct coloring (generate hue from cell index)
                      const subsetBg = isHighlightedSubset ? `hsla(${(idx * 67) % 360}, 60%, 50%, 0.2)` : undefined;

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => {
                            setHoveredCellIdx(idx);
                            if (cellValue !== 0) setHoveredCellNum(cellValue);
                          }}
                          onMouseLeave={() => {
                            setHoveredCellIdx(null);
                            setHoveredCellNum(null);
                            endLongPress();
                          }}
                          onMouseDown={() => startLongPress(idx)}
                          onMouseUp={endLongPress}
                          onClick={(e) => handleCellClick(idx, e)}
                          style={isMounted ? {
                            color: cellValue !== 0 ? customColor : undefined,
                            backgroundColor: subsetBg || (isMatchHover ? customBg : undefined),
                          } : undefined}
                          className={`relative flex items-center justify-center select-none cursor-pointer transition-all ${borderTop} ${borderLeft} ${
                            isSelected
                              ? "bg-zinc-200/80 dark:bg-zinc-700/60 ring-1 ring-inset ring-zinc-400 dark:ring-zinc-500 z-10"
                              : isCrosshair
                              ? "bg-zinc-100/50 dark:bg-zinc-900/50"
                              : isHint
                              ? "bg-amber-500/20 dark:bg-amber-400/20 ring-2 ring-amber-500 z-10 animate-pulse"
                              : isGiven
                              ? "bg-zinc-50 dark:bg-zinc-900/20 hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                              : "bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/10"
                          }
                          ${isMatchHover ? "shadow-inner scale-102 font-extrabold z-10" : ""}`}
                        >
                          {/* Cell Value Rendering */}
                          {cellValue !== 0 ? (
                            <span
                              className={`text-base md:text-xl font-sans leading-none ${
                                isGiven ? "font-extrabold" : "font-medium"
                              }`}
                            >
                              {cellValue}
                            </span>
                          ) : (
                            // Candidate Pencil Marks (Only on Long Press if unselected)
                            (isLongPressed) && (
                              <div className="absolute inset-0.5 grid grid-cols-3 grid-rows-3 p-0.5 gap-0.5 pointer-events-none opacity-80 animate-fade-in">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                                  const isCand = getCandidates(board, idx).includes(n);
                                  return (
                                    <span
                                      key={n}
                                      style={isMounted ? { color: isCand ? getNumColor(n, isDarkMode) : "transparent" } : undefined}
                                      className="text-[8px] md:text-[10px] font-mono font-bold leading-none flex items-center justify-center"
                                    >
                                      {n}
                                    </span>
                                  );
                                })}
                              </div>
                            )
                          )}

                          {/* Conflict detection marker */}
                          {cellValue !== 0 && !isGiven && cellValue !== solution[idx] && (
                            <div className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Number Pad for Touch Devices */}
        <div className="w-full max-w-[500px] flex flex-col space-y-2 p-3 border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/5 rounded-xl">
          <div className="grid grid-cols-5 gap-2">
            {[6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => handleNumPadInput(n)}
                style={isMounted ? {
                  color: getNumColor(n, isDarkMode),
                  borderColor: getNumColor(n, isDarkMode) + "30",
                } : undefined}
                className="py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border font-extrabold rounded-lg shadow-sm text-sm hover:scale-105 active:scale-95 transition-all"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => handleNumPadInput(n)}
                style={isMounted ? {
                  color: getNumColor(n, isDarkMode),
                  borderColor: getNumColor(n, isDarkMode) + "30",
                } : undefined}
                className="py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border font-extrabold rounded-lg shadow-sm text-sm hover:scale-105 active:scale-95 transition-all"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => handleNumPadClear()}
              className="py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-600 dark:text-red-400 font-extrabold rounded-lg shadow-sm text-xs hover:scale-105 active:scale-95 transition-all"
            >
              {t.numPadClear}
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="w-full max-w-[500px] p-4 text-xs font-mono text-zinc-500 dark:text-zinc-400 space-y-1 bg-zinc-50 dark:bg-zinc-900/10 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
          <p className="flex items-start gap-1">
            <span className="text-emerald-500">⚡</span>
            <span>{t.keyboardTip}</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-emerald-500">⚡</span>
            <span>{t.ctrlTip}</span>
          </p>
        </div>
      </div>

      {/* RIGHT SECTION: Multi-Sector Selection Tools, Assistant & Explanation Hint Panel */}
      <div className="lg:col-span-5 space-y-6">
        {/* Sectors Selection Tools Panel */}
        <div className="p-5 border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 font-sans tracking-tight border-b border-zinc-100 dark:border-zinc-800/60 pb-2 flex items-center gap-1.5">
            <span>🔲</span>
            <span>{t.sectorHeader}</span>
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 block mb-1">
                {t.selectRow}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 9 }, (_, r) => (
                  <button
                    key={r}
                    onClick={() => selectRow(r)}
                    className="h-7 w-7 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-md transition-all active:scale-95"
                  >
                    R{r + 1}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 block mb-1">
                {t.selectCol}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 9 }, (_, c) => (
                  <button
                    key={c}
                    onClick={() => selectCol(c)}
                    className="h-7 w-7 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-md transition-all active:scale-95"
                  >
                    C{c + 1}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 block mb-1">
                {t.selectBox}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 9 }, (_, b) => (
                  <button
                    key={b}
                    onClick={() => selectBox(b)}
                    className="h-7 w-7 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-md transition-all active:scale-95"
                  >
                    B{b + 1}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Combined possibilities widget based on bitset OR of selection */}
            {selectedIndices.length > 0 && combinedPossibilities.length > 0 && (
              <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800/60">
                 <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 block mb-1.5">
                   {lang === 'pt' ? 'União de Possibilidades da Seleção (OR)' : 'Selection Union Possibilities (OR)'}
                 </span>
                 <div className="inline-grid grid-cols-3 grid-rows-3 gap-1 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                      const isCand = combinedPossibilities.includes(n);
                      return (
                        <span
                          key={n}
                          style={isMounted ? { color: isCand ? getNumColor(n, isDarkMode) : "transparent" } : undefined}
                          className="h-4 w-4 text-[10px] font-mono font-bold flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-sm"
                        >
                          {n}
                        </span>
                      );
                    })}
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Naked Subset Action Tool */}
        <div className="p-5 border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 rounded-xl shadow-sm space-y-3">
           <button
             onClick={highlightNakedSubsets}
             className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-bold rounded-lg shadow-sm transition-all"
           >
             {t.nakedSubsetBtn}
           </button>
        </div>

        {/* Sector Candidate Assistance Panel */}
        <div className="p-5 border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 font-sans tracking-tight border-b border-zinc-100 dark:border-zinc-800/60 pb-2 flex items-center gap-1.5">
            <span>📊</span>
            <span>{t.missingHeader}</span>
          </h3>

          {sectorMissingList.length === 0 ? (
            <p className="text-xs font-serif text-zinc-500 dark:text-zinc-400 italic">
              {t.missingNone}
            </p>
          ) : (
            <div className="space-y-3">
              {sectorMissingList.map((sec, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900/35 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                    {sec.name}:
                  </span>
                  <div className="flex gap-1.5">
                    {sec.missing.map((num) => (
                      <span
                        key={num}
                        style={isMounted ? {
                          color: getNumColor(num, isDarkMode),
                          backgroundColor: getNumBgColor(num, isDarkMode),
                        } : undefined}
                        className="h-6 w-6 font-extrabold text-xs flex items-center justify-center rounded-md border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logical Tutor Explanations Hint panel */}
        <div className="p-5 border border-amber-500/20 dark:border-amber-400/20 bg-amber-500/[0.01] dark:bg-amber-400/[0.005] rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 font-sans tracking-tight flex items-center gap-1.5">
              <span>🧠</span>
              <span>{t.hintHeader}</span>
            </h3>
          </div>

          <button
            onClick={handleFindNakedSingle}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
          >
            {t.findSingleBtn}
          </button>

          {hintMessage && (
            <p className="text-xs font-mono text-amber-600 dark:text-amber-400 italic bg-amber-500/5 dark:bg-amber-500/[0.02] p-3 rounded-lg border border-amber-500/10">
              {hintMessage}
            </p>
          )}

          {!hint && !hintMessage && (
            <p className="text-xs font-serif text-zinc-500 dark:text-zinc-400 italic">
              {t.hintEmpty}
            </p>
          )}

          {hint && (
            <div className="space-y-4 animate-fade-in text-sm leading-relaxed">
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/[0.04] border border-amber-500/20 rounded-lg">
                <h4 className="font-extrabold text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1.5">
                  ✨ {t.hintNakedSingleTitle}
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 font-serif leading-relaxed">
                  {t.hintNakedSingleDesc}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-400 mr-1">Cell:</span>
                    <strong className="text-zinc-800 dark:text-zinc-100">
                      Row {Math.floor(hint.cellIdx / 9) + 1}, Col {(hint.cellIdx % 9) + 1}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 mr-1">Value:</span>
                    <strong
                      style={isMounted ? { color: getNumColor(hint.val, isDarkMode) } : undefined}
                      className="font-extrabold text-sm"
                    >
                      {hint.val}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  {t.reasonsTitle}
                </h5>
                <ul className="space-y-2 list-none p-0 text-xs font-serif text-zinc-600 dark:text-zinc-400">
                  {hint.reasons.map((re, i) => {
                    const typeLabel = isPt
                      ? re.type === "row"
                        ? "linha"
                        : re.type === "col"
                        ? "coluna"
                        : "bloco"
                      : re.type;

                    const text =
                      re.type === "box"
                        ? t.explainBlockedBox
                            .replace("{num}", `**${re.num}**`)
                            .replace("{row}", `**${re.blockRow + 1}**`)
                            .replace("{col}", `**${re.blockCol + 1}**`)
                        : t.explainBlocked
                            .replace("{num}", `**${re.num}**`)
                            .replace("{row}", `**${re.blockRow + 1}**`)
                            .replace("{col}", `**${re.blockCol + 1}**`)
                            .replace("{type}", `**${typeLabel}**`);

                    return (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 border-l-2 border-zinc-200 dark:border-zinc-800 pl-2 py-0.5"
                      >
                        <span className="text-red-500 font-mono text-[10px] select-none">✕</span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-800 dark:text-zinc-200">$1</strong>'),
                          }}
                        />
                      </li>
                    );
                  })}
                  <li className="flex items-start gap-1.5 border-l-2 border-emerald-500 pl-2 py-1 mt-3 bg-emerald-500/5 dark:bg-emerald-500/[0.02]">
                    <span className="text-emerald-500 font-mono text-xs select-none">✓</span>
                    <strong className="text-zinc-800 dark:text-zinc-100 font-sans text-xs">
                      {t.explainValid.replace("{val}", hint.val.toString())}
                    </strong>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
