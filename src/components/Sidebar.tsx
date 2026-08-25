"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LanguageSwitcher from "../app/[lang]/LanguageSwitcher";

interface SidebarProps {
  lang: "en" | "pt";
}

function SidebarContent({ lang }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const isPt = lang === "pt";

  type WorkspaceMode = "drafts" | "essays" | "projects";
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("drafts");

  // Re-fetch drafts whenever user logs in, out, or synchronizes files
  const fetchDrafts = (mode: WorkspaceMode = "drafts") => {
    const token = typeof window !== "undefined" ? localStorage.getItem("GITHUB_PAT") : null;
    const repo = typeof window !== "undefined" ? localStorage.getItem("WORKSPACE_REPO") || "racoci/racoci.github.io" : "racoci/racoci.github.io";
    if (token) {
      if (mode === "drafts") {
        fetch(`https://api.github.com/repos/${repo}/contents/src/content/drafts?ref=notes-drafts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error();
            return res.json();
          })
          .then((files) => {
            if (Array.isArray(files)) {
              setDrafts(files.filter((f) => f.name.endsWith(".mdx")).map((f) => ({
                name: f.name,
                path: f.path,
                sha: f.sha,
                branch: "notes-drafts",
                category: "drafts"
              })));
            } else {
              setDrafts([]);
            }
          })
          .catch(() => setDrafts([]));
      } else {
        fetch(`https://api.github.com/repos/${repo}/branches/main`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error();
            return res.json();
          })
          .then((branchData) => {
            const treeSha = branchData.commit.commit.tree.sha;
            return fetch(`https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=true`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          })
          .then((res) => res.json())
          .then((treeData) => {
            const allFiles = treeData.tree || [];
            if (mode === "essays") {
              const essayFiles = allFiles.filter((f: any) => 
                f.type === "blob" && 
                f.path.startsWith("src/content/essays/") && 
                f.path.endsWith(".mdx")
              ).map((f: any) => {
                const name = f.path.replace("src/content/essays/", "");
                return {
                  name,
                  path: f.path,
                  sha: f.sha,
                  branch: "main",
                  category: "essays"
                };
              });
              setDrafts(essayFiles);
            } else if (mode === "projects") {
              const projectFiles = allFiles.filter((f: any) => {
                if (f.type !== "blob" || !f.path.startsWith("src/content/") || !f.path.endsWith(".mdx")) return false;
                const isDraft = f.path.startsWith("src/content/drafts/");
                const isEssay = f.path.startsWith("src/content/essays/");
                const isAbout = f.path.startsWith("src/content/about/");
                const isNow = f.path.startsWith("src/content/now/");
                const isSystems = f.path.startsWith("src/content/systems/");
                return !isDraft && !isEssay && !isAbout && !isNow && !isSystems;
              }).map((f: any) => {
                const name = f.path.replace("src/content/", "");
                return {
                  name,
                  path: f.path,
                  sha: f.sha,
                  branch: "main",
                  category: "projects"
                };
              });
              setDrafts(projectFiles);
            }
          })
          .catch(() => setDrafts([]));
      }
    } else {
      setDrafts([]);
    }
  };

  useEffect(() => {
    const cachedMode = (typeof window !== "undefined" ? localStorage.getItem("WORKSPACE_MODE") as WorkspaceMode : null) || "drafts";
    setWorkspaceMode(cachedMode);
    fetchDrafts(cachedMode);

    const handleSync = () => {
      const mode = (typeof window !== "undefined" ? localStorage.getItem("WORKSPACE_MODE") as WorkspaceMode : null) || "drafts";
      setWorkspaceMode(mode);
      fetchDrafts(mode);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleSync);
      window.addEventListener("workspace-sync", handleSync);
      window.addEventListener("workspace-mode-change", handleSync);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleSync);
        window.removeEventListener("workspace-sync", handleSync);
        window.removeEventListener("workspace-mode-change", handleSync);
      }
    };
  }, []);

  const dict = {
    en: {
      about: "About",
      now: "Now",
      projects: "Projects",
      gardenHeader: "Garden Branches",
      systems: "⚙️ Systems Engineering",
      essays: "🧠 Essays & Logic",
      lab: "🧪 Laboratory / Logistics",
      featuredHeader: "Interactive Demos",
      finance: "📈 B3 Screener (Finance)",
      nodegraft: "🎮 NodeGraft 3D (WebGPU)",
      sudoku: "🧩 Sudoku Mentor",
      complexplotter: "🌌 Complex Plotter",
      mobileMenuBtn: "Menu",
      copyright: "Statically cultivated.",
    },
    pt: {
      about: "Sobre",
      now: "Agora",
      projects: "Projetos",
      gardenHeader: "Ramos do Jardim",
      systems: "⚙️ Engenharia de Sistemas",
      essays: "🧠 Ensaios e Lógica",
      lab: "🧪 Laboratório / Logística",
      featuredHeader: "Demos Interativas",
      finance: "📈 Screener B3 (Finanças)",
      nodegraft: "🎮 NodeGraft 3D (WebGPU)",
      sudoku: "🧩 Mentor de Sudoku",
      complexplotter: "🌌 Gráficos Complexos",
      mobileMenuBtn: "Menu",
      copyright: "Cultivado estaticamente.",
    }
  };

  const t = isPt ? dict.pt : dict.en;

  const isActive = (path: string) => {
    return pathname === path || pathname === `${path}/`;
  };

  // Nav items lists
  const coreLinks = [
    { href: `/${lang}/about`, label: t.about },
    { href: `/${lang}/now`, label: t.now },
    { href: `/${lang}/projects`, label: t.projects },
  ];

  const gardenLinks = [
    { href: `/${lang}/systems`, label: t.systems },
    { href: `/${lang}/essays`, label: t.essays },
    { href: `/${lang}/lab`, label: t.lab },
  ];

  const featuredLinks = [
    { href: `/${lang}/projects/nodegraft`, label: t.nodegraft },
    { href: `/${lang}/finance`, label: t.finance },
    { href: `/${lang}/projects/sudoku`, label: t.sudoku },
    { href: `/${lang}/projects/complex-plotter`, label: t.complexplotter },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-7">
        {/* Brand / Title Logo */}
        <div className="border-b border-zinc-200/60 dark:border-zinc-800/60 pb-5">
          <Link href={`/${lang}`} className="group flex items-center gap-2.5" onClick={() => setIsOpen(false)}>
            <span className="h-3 w-3 rounded-full bg-emerald-600 dark:bg-emerald-500 group-hover:scale-125 transition-transform" />
            <span className="font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 text-lg font-sans">
              lucas <span className="text-emerald-600 dark:text-emerald-400 font-normal">racoci</span>
            </span>
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Digital Garden</span>
            <LanguageSwitcher currentLang={lang} />
          </div>
        </div>

        {/* Core Pages Links */}
        <nav className="flex flex-col gap-1.5">
          {coreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive(link.href)
                  ? "bg-emerald-500/10 dark:bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Workspace Files List (Visible only when logged in) */}
        {(drafts.length > 0 || (typeof window !== "undefined" && localStorage.getItem("GITHUB_PAT"))) && (
          <div className="space-y-2 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block px-2.5">
              ✍️ {isPt ? "Workspace CMS" : "Workspace CMS"}
            </span>
            
            {/* Dropdown Select Mode */}
            <div className="px-1 py-1">
              <select
                value={workspaceMode}
                onChange={(e) => {
                  const val = e.target.value as WorkspaceMode;
                  setWorkspaceMode(val);
                  localStorage.setItem("WORKSPACE_MODE", val);
                  fetchDrafts(val);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("workspace-mode-change"));
                  }
                }}
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="drafts">{isPt ? "Rascunhos (notes-drafts)" : "Drafts (notes-drafts)"}</option>
                <option value="essays">{isPt ? "Ensaios Publicados (main)" : "Published Essays (main)"}</option>
                <option value="projects">{isPt ? "Projetos Publicados (main)" : "Published Projects (main)"}</option>
              </select>
            </div>

            <nav className="flex flex-col gap-0.5 max-h-52 overflow-y-auto scrollbar-thin">
              {drafts.map((d) => {
                const currentPath = searchParams ? searchParams.get("path") : null;
                const isSelected = pathname.includes("/workspace") && (
                  (d.path && d.path === currentPath) || 
                  (!currentPath && pathname.includes(d.name))
                );
                const queryStr = d.path 
                  ? `path=${d.path}&branch=${d.branch}&category=${d.category}&name=${d.name}`
                  : `draft=${d.name}`;
                return (
                  <Link
                    key={d.name}
                    href={`/${lang}/workspace?${queryStr}`}
                    onClick={() => setIsOpen(false)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold font-mono truncate transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
                    }`}
                  >
                    <span className="truncate">📄 {d.name.replace(".mdx", "")}</span>
                  </Link>
                );
              })}
              {drafts.length === 0 && (
                <span className="text-[10px] text-zinc-500 italic block text-center py-2">
                  {isPt ? "Nenhum arquivo" : "No files found"}
                </span>
              )}
            </nav>
          </div>
        )}

        {/* Garden Categories Links */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block px-3">
            {t.gardenHeader}
          </span>
          <nav className="flex flex-col gap-1">
            {gardenLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive(link.href)
                    ? "bg-emerald-500/10 dark:bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Featured Projects Links */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block px-3">
            {t.featuredHeader}
          </span>
          <nav className="flex flex-col gap-1">
            {featuredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive(link.href)
                    ? "bg-emerald-500/10 dark:bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer Signature */}
      <div className="border-t border-zinc-200/55 dark:border-zinc-800/40 pt-4 text-[10px] text-zinc-400 font-mono mt-8">
        <p>© {new Date().getFullYear()} Lucas Racoci.</p>
        <p className="mt-0.5">{t.copyright}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sticky Sidebar (Visible on large screens) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-zinc-50 dark:bg-zinc-950/80 border-r border-zinc-200/60 dark:border-zinc-800/50 h-screen sticky top-0 p-6 overflow-y-auto z-30 shadow-sm backdrop-blur-sm">
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Navbar Header (Visible only on mobile/tablet) */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-zinc-50/90 dark:bg-zinc-950/90 border-b border-zinc-200/60 dark:border-zinc-800/50 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <Link href={`/${lang}`} className="group flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
          <span className="font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 text-sm">
            lucas <span className="text-emerald-600 dark:text-emerald-400 font-normal">racoci</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher currentLang={lang} />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 transition-colors"
          >
            {isOpen ? "Close" : t.mobileMenuBtn}
          </button>
        </div>
      </header>

      {/* 3. Sliding Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-35 flex">
          {/* Backdrop shade */}
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs" onClick={() => setIsOpen(false)} />
          {/* Slider Menu panel */}
          <div className="relative w-full max-w-[280px] bg-zinc-50 dark:bg-zinc-950 p-6 h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-40 border-r border-zinc-200 dark:border-zinc-800">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}

export default function Sidebar({ lang }: SidebarProps) {
  return (
    <Suspense fallback={<div className="w-6 h-6 m-4" />}>
      <SidebarContent lang={lang} />
    </Suspense>
  );
}
