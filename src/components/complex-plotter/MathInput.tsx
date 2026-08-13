import React, { useState, useRef, useEffect } from 'react';

const KNOWN_FUNCTIONS = [
  "sin", "cos", "tan", "sec", "csc", "cot",
  "sinh", "cosh", "tanh", "exp", "log", "ln", "sqrt",
  "arcsin", "arccos", "arctan", "zeta", "eta", "gamma",
  "erf", "abs", "arg", "conj", "real", "imag", "sum", "prod", "frac",
  "pi", "tau", "phi", "e"
];

const highlightMath = (text: string) => {
  // Simple regex to match letters (variables/functions) and numbers
  // We'll wrap known keywords in special colors
  const regex = /([a-zA-Z]+)|([0-9.]+)|([^a-zA-Z0-9.]+)/g;
  let result = [];
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // Word
      if (KNOWN_FUNCTIONS.includes(match[1])) {
        result.push(<span key={key++} className="text-emerald-400 font-bold">{match[1]}</span>);
      } else if (match[1] === 'z') {
        result.push(<span key={key++} className="text-cyan-400 font-bold italic">{match[1]}</span>);
      } else {
        result.push(<span key={key++} className="text-purple-300 italic">{match[1]}</span>);
      }
    } else if (match[2]) {
      // Number
      result.push(<span key={key++} className="text-orange-300">{match[2]}</span>);
    } else {
      // Symbols
      result.push(<span key={key++} className="text-zinc-400">{match[3]}</span>);
    }
  }
  return result;
};

interface MathInputProps {
  value: string;
  onChange: (val: string) => void;
  hasError: boolean;
}

export default function MathInput({ value, onChange, hasError }: MathInputProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cursorPos, setCursorPos] = useState(0);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simple logic to find the word being typed before the cursor
  useEffect(() => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/[a-zA-Z\\]+$/);
    if (match) {
      let word = match[0];
      let hasBackslash = false;
      if (word.startsWith('\\')) {
          hasBackslash = true;
          word = word.slice(1);
      }
      if (word.length > 0) {
        const matches = KNOWN_FUNCTIONS.filter(f => f.startsWith(word));
        if (matches.length > 0 && matches[0] !== word) {
          setSuggestions(matches.map(m => hasBackslash ? '\\' + m : m));
          setShowAutocomplete(true);
          setActiveSuggestionIndex(0);
          return;
        }
      }
    }
    setShowAutocomplete(false);
  }, [value, cursorPos]);

  const insertSuggestion = (suggestion: string) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const match = textBeforeCursor.match(/[a-zA-Z\\]+$/);
    if (match) {
      const newTextBefore = textBeforeCursor.slice(0, -match[0].length) + suggestion;
      onChange(newTextBefore + textAfterCursor);
      setShowAutocomplete(false);
      // Re-focus and set cursor position asynchronously
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newTextBefore.length, newTextBefore.length);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(i => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(i => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSuggestion(suggestions[activeSuggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    }
  };

  const handleSelect = (e: any) => {
    setCursorPos(e.target.selectionStart || 0);
  };

  return (
    <div className="relative w-full">
      <div className={`relative w-full rounded-lg bg-black/40 border transition-all ${hasError ? 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-zinc-700/50 focus-within:border-emerald-500/50'}`}>
        
        {/* Highlight Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none p-3 text-sm font-mono whitespace-pre overflow-hidden flex items-center"
          aria-hidden="true"
        >
          {highlightMath(value)}
        </div>

        {/* Transparent Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
             onChange(e.target.value);
             setCursorPos(e.target.selectionStart || 0);
          }}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          spellCheck="false"
          autoComplete="off"
          className="relative w-full bg-transparent outline-none p-3 text-sm font-mono text-transparent caret-zinc-200 z-10 block"
        />
      </div>

      {showAutocomplete && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li 
              key={s} 
              onMouseDown={(e) => { e.preventDefault(); insertSuggestion(s); }}
              className={`px-3 py-1.5 text-sm font-mono cursor-pointer transition-colors ${i === activeSuggestionIndex ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
