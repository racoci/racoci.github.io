"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
    /<(ComplexPlotter|NodeGraftViewer|B3Screener|SudokuViewer|SudokuMiniWidget|QuadtreeVisualizer|MappingVisualizer|CountersVisualizer|PolynomialEditor)\s*\/>/g,
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

export default function WorkspacePage({ params }: PageProps) {
  const { lang } = React.use(params);
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [repo, setRepo] = useState("racoci/racoci.github.io");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Draft States
  const [drafts, setDrafts] = useState<DraftFile[]>([]);
  const [activeDraft, setActiveDraft] = useState<DraftFile | null>(null);
  const [editorText, setEditorText] = useState("");
  const [slug, setSlug] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"saved" | "unsaved" | "syncing" | "error">("saved");

  // Login UI error/success messages
  const [loginError, setLoginError] = useState("");

  // Refs for tracking changes
  const lastSavedTextRef = useRef("");

  useEffect(() => {
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
  }, [isAuthenticated, hasUnsavedChanges, activeDraft, editorText]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!token) {
      setLoginError("Por favor, forneça um Personal Access Token (PAT) válido.");
      return;
    }

    // Verify token validity by calling user API
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

  const fetchDraftsList = async (authToken: string, targetRepo: string) => {
    try {
      // 1. Check if "notes-drafts" branch exists, create if not
      const branchRes = await fetch(`https://api.github.com/repos/${targetRepo}/branches/notes-drafts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (branchRes.status === 404) {
        // Fetch main branch SHA
        const mainRes = await fetch(`https://api.github.com/repos/${targetRepo}/branches/main`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!mainRes.ok) throw new Error("Branch principal não encontrada.");
        const mainData = await mainRes.json();
        const sha = mainData.commit.sha;

        // Create branch refs
        await fetch(`https://api.github.com/repos/${targetRepo}/git/refs`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "refs/heads/notes-drafts", sha }),
        });
      }

      // 2. Fetch drafts files
      const contentRes = await fetch(`https://api.github.com/repos/${targetRepo}/contents/src/content/drafts?ref=notes-drafts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (contentRes.status === 404) {
        // Empty drafts folder
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
    const filename = `rascunho-${Date.now()}`;
    const initialContent = `# Novo Rascunho\n\nComece a formular sua nota aqui...`;

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

  const handleSelectDraft = async (file: DraftFile) => {
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
      const commitMsg = await generateCommitMessage(editorText);
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

      // 1. Commit/Push directly to the main branch
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

      // 2. Delete draft from the notes-drafts branch
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
              Faça login com seu GitHub PAT para gerenciar rascunhos de notas.
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
              <span className="text-[9px] text-zinc-500 block leading-relaxed mt-1">
                Gere um token clássico com escopo <code className="text-emerald-400 font-mono">repo</code> ou de grão fino com acesso de escrita ao seu portfólio.
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

  // Render Core Workspace dashboard (Once logged in)
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* CMS Workspace Top Bar */}
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 bg-zinc-900/40 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/pt/projects" className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs flex items-center gap-1.5 font-bold">
            ← Voltar
          </Link>
          <div className="h-4 w-px bg-zinc-800"></div>
          <span className="font-extrabold tracking-tight text-sm uppercase text-zinc-300 font-mono">
            CMS Workspace Commander
          </span>
        </div>

        {/* Sync/Status indicators */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              syncStatus === "saved" ? "bg-emerald-500" :
              syncStatus === "unsaved" ? "bg-yellow-500 animate-pulse" :
              syncStatus === "syncing" ? "bg-blue-500 animate-spin border border-t-transparent" :
              "bg-red-500 animate-pulse"
            }`} />
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-zinc-400">
              {syncStatus === "saved" && "Sincronizado no GitHub"}
              {syncStatus === "unsaved" && "Modificações pendentes (Salva em 1min)"}
              {syncStatus === "syncing" && "Enviando commits..."}
              {syncStatus === "error" && "Erro de sincronização de rede"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold rounded-lg transition-all text-red-400 cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Editor Main Board Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* Left column: Sidebar */}
        <aside className="w-64 border-r border-zinc-800 flex flex-col shrink-0 bg-zinc-950">
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={handleCreateNewNote}
              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+ Criar Rascunho</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 block px-2 mb-2">
              Meus Rascunhos (notes-drafts)
            </span>
            {drafts.length === 0 ? (
              <div className="text-[11px] text-zinc-600 px-2 py-4 italic font-serif">
                Nenhum rascunho de nota localizado nesta branch.
              </div>
            ) : (
              drafts.map((d, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectDraft(d)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-xs font-mono truncate flex items-center justify-between ${
                    activeDraft?.path === d.path
                      ? "bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-bold"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`}
                >
                  <span className="truncate">📄 {d.name}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editing and preview views */}
        {activeDraft ? (
          <main className="flex-1 flex overflow-hidden">
            
            {/* Middle: Code Editor */}
            <div className="w-1/2 flex flex-col border-r border-zinc-800 bg-zinc-950">
              <div className="h-10 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-zinc-900/20 font-mono text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500">Editando:</span>
                  <span className="text-emerald-400 font-bold">{activeDraft.name}</span>
                </div>

                <button
                  onClick={handlePublish}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-lg"
                >
                  🚀 Publicar nota na Main
                </button>
              </div>

              <textarea
                value={editorText}
                onChange={(e) => handleEditorChange(e.target.value)}
                className="flex-1 p-6 bg-zinc-950 text-zinc-100 font-mono text-sm leading-relaxed outline-none border-none resize-none overflow-y-auto selection:bg-emerald-500/10 focus:ring-0"
                spellCheck="false"
              />
            </div>

            {/* Right: Rich Preview */}
            <div className="w-1/2 flex flex-col bg-zinc-950 overflow-y-auto p-6 scrollbar-thin">
              <div className="border-b border-zinc-800 pb-3 mb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase block mb-1">
                  Live Rich MDX Preview (Real-time WYSIWYG)
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50">
                  {slug.toUpperCase()}
                </h1>
              </div>

              <div className="prose dark:prose-invert prose-emerald max-w-none text-zinc-300 font-serif leading-relaxed text-sm md:text-base space-y-4">
                {parseMDXContent(editorText).map((token, idx) => {
                  if (token.type === "text") {
                    return (
                      <div key={idx} className="whitespace-pre-line my-4 font-serif">
                        {token.content}
                      </div>
                    );
                  }

                  if (token.type === "math_inline") {
                    return <InlineMath key={idx} math={token.content} />;
                  }

                  if (token.type === "math_block") {
                    return <BlockMath key={idx} math={token.content} />;
                  }

                  if (token.type === "code") {
                    if (token.lang === "plantuml") {
                      return <PlantUMLRenderer key={idx} code={token.content} />;
                    }

                    // Treat other code blocks (like standard javascript, python, etc) natively
                    return (
                      <pre key={idx} className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-x-auto font-mono text-xs text-zinc-100 my-4">
                        <code>{token.content}</code>
                      </pre>
                    );
                  }

                  if (token.type === "widget") {
                    return (
                      <div key={idx} className="my-8 border border-zinc-800/50 p-4 bg-zinc-900/10 rounded-2xl relative shadow-inner overflow-hidden">
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
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

          </main>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 font-serif italic p-6 text-center">
            <div className="w-16 h-16 border border-dashed border-zinc-800 rounded-full flex items-center justify-center mb-4 text-2xl">
              ✍
            </div>
            Nenhum rascunho de nota selecionado.
            <span className="text-xs text-zinc-600 font-mono tracking-wider uppercase mt-2 not-italic">
              Selecione um rascunho na barra lateral ou clique em "+ Criar Rascunho" para começar
            </span>
          </div>
        )}

      </div>

    </div>
  );
}
