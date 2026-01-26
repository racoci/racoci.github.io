"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Repository {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  homepage: string | null;
}

interface PageProps {
  params: Promise<{ lang: string }>;
}

const dict = {
  en: {
    title: "Projects & Repositories",
    subtitle:
      "A real-time listing of my public repositories hosted on GitHub, integrating engineering fronts, utilities, and libraries.",
    filterPlaceholder: "Filter by name or description...",
    loadingError:
      "Oops! We couldn't load the projects directly from the GitHub API right now (rate limits exceeded or network error).",
    githubProfileBtn: "View profile directly on GitHub",
    noReposFound: 'No projects found matching the term "{search}".',
    noDescription: "No description provided.",
    featuredTitle: "Featured Project",
    featuredBadge: "WebGPU Engine",
    featuredDesc: "An interactive, real-time procedural 3D model generator driven by WebGPU Compute Shaders. Solves mathematical Signed Distance Fields (SDF) and extracts structured polygonal meshes via Dual Contouring.",
    featuredBtn: "Launch NodeGraft Engine",
    screenerTitle: "Quantitative Analytics",
    screenerBadge: "Finance & Edge Caching",
    screenerDesc: "An interactive B3 stock screener utilizing localized client-side caching (24h TTL) and edge sorting overrides. Solves professional financial logic for loss-making companies and operates with zero operational costs.",
    screenerBtn: "Explore B3 Screener",
    sudokuTitle: "Sudoku Mentor / CSP Solver",
    sudokuBadge: "Deductive Logic & CSP",
    sudokuDesc: "An interactive, type-safe client-side Sudoku Mentor and Procedural Generator. Features equidistant HSL cell color mapping, visual constraint crosshairs, and step-by-step logical explanations of 'Naked Singles' to teach advanced deductive techniques.",
    sudokuBtn: "Launch Sudoku Mentor",
  },
  pt: {
    title: "Projetos & Repositórios",
    subtitle:
      "Uma listagem em tempo real dos meus repositórios públicos hospedados no GitHub, integrando frentes de engenharia, utilitários e bibliotecas.",
    filterPlaceholder: "Filtrar por nome ou descrição...",
    loadingError:
      "Ops! Não foi possível carregar os projetos diretamente da API do GitHub no momento (limites de taxa de requisições excedidos ou erro de rede).",
    githubProfileBtn: "Ver perfil diretamente no GitHub",
    noReposFound: 'Nenhum projeto encontrado correspondendo ao termo "{search}".',
    noDescription: "Nenhuma descrição fornecida.",
    featuredTitle: "Projeto de Destaque",
    featuredBadge: "Motor WebGPU",
    featuredDesc: "Gerador procedural 3D de modelos interativos alimentado por Compute Shaders em WebGPU. Resolve matematicamente Campos de Distância com Sinal (SDF) e extrai malhas poligonais em tempo real via Dual Contouring de alta performance.",
    featuredBtn: "Iniciar Motor NodeGraft",
    screenerTitle: "Análise Quantitativa",
    screenerBadge: "Finanças & Cache Edge",
    screenerDesc: "Um triador fundamentalista interativo de ações da B3 utilizando cache localizado no cliente (24h de TTL) e ordenação analítica avançada no navegador. Corrige regras de mercado para empresas em prejuízo e opera com custo zero de infraestrutura.",
    screenerBtn: "Explorar Screener B3",
    sudokuTitle: "Mentor de Sudoku / Solucionador CSP",
    sudokuBadge: "Lógica Dedutiva & CSP",
    sudokuDesc: "Um mentor interativo e gerador procedural de Sudoku executado totalmente no cliente. Apresenta mapeamento de cores HSL equidistantes, linhas de mira visual de restrições e explicações lógicas passo a passo de 'Naked Singles' para ensinar técnicas dedutivas avançadas.",
    sudokuBtn: "Iniciar Mentor de Sudoku",
  },
};

export default function ProjectsPage({ params }: PageProps) {
  const { lang } = React.use(params);
  const isPt = lang === "pt";
  const t = isPt ? dict.pt : dict.en;

  const [repos, setRepos] = useState<Repository[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const username = "racoci";
    fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=30`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Falha ao buscar repositórios.");
        }
        return res.json();
      })
      .then((data: Repository[]) => {
        // Filtrar forks para mostrar apenas projetos originais e ordenar por estrelas
        const originalRepos = data
          .filter((repo) => !repo.name.startsWith(".")) // ocultar configs
          .sort((a, b) => b.stargazers_count - a.stargazers_count);
        setRepos(originalRepos);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description &&
        repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          {t.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Featured Project - NodeGraft */}
      <div className="p-6 border border-emerald-500/20 dark:border-emerald-400/20 bg-emerald-500/[0.02] dark:bg-emerald-400/[0.01] rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm hover:shadow-md transition-all">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-full">
              {t.featuredTitle}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 rounded-full font-mono">
              {t.featuredBadge}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            NodeGraft Engine / PolyGraft 3D
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-sm md:text-base">
            {t.featuredDesc}
          </p>
        </div>
        <div className="w-full md:w-auto shrink-0">
          <Link
            href={`/${lang}/projects/nodegraft`}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-950 font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm group"
          >
            <span>{t.featuredBtn}</span>
            <svg
              className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Featured Project - B3 Screener */}
      <div className="p-6 border border-emerald-500/20 dark:border-emerald-400/20 bg-emerald-500/[0.02] dark:bg-emerald-400/[0.01] rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm hover:shadow-md transition-all">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-full">
              {t.featuredTitle}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 rounded-full font-mono">
              {t.screenerBadge}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Screener B3 — Quantitative Dashboard
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-sm md:text-base">
            {t.screenerDesc}
          </p>
        </div>
        <div className="w-full md:w-auto shrink-0">
          <Link
            href={`/${lang}/finance`}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-950 font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm group"
          >
            <span>{t.screenerBtn}</span>
            <svg
              className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Featured Project - Sudoku Mentor */}
      <div className="p-6 border border-emerald-500/20 dark:border-emerald-400/20 bg-emerald-500/[0.02] dark:bg-emerald-400/[0.01] rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm hover:shadow-md transition-all">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-full">
              {t.featuredTitle}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 rounded-full font-mono">
              {t.sudokuBadge}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.sudokuTitle}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-sm md:text-base">
            {t.sudokuDesc}
          </p>
        </div>
        <div className="w-full md:w-auto shrink-0">
          <Link
            href={`/${lang}/projects/sudoku`}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-950 font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm group"
          >
            <span>{t.sudokuBtn}</span>
            <svg
              className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Caixa de Busca */}
      {!error && !loading && (
        <div className="relative">
          <input
            type="text"
            placeholder={t.filterPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all text-sm"
          />
        </div>
      )}

      {/* Grid de Projetos */}
      {loading ? (
        // Skeletons de Loading
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-xl space-y-3 animate-pulse"
            >
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-5/6" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
              <div className="flex gap-4 pt-2">
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-10" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-10" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Estado de Erro / Fallback elegante
        <div className="p-6 text-center border border-dashed border-red-200 dark:border-red-900/50 bg-red-500/5 rounded-xl space-y-4">
          <p className="text-zinc-700 dark:text-zinc-300 font-serif">
            {t.loadingError}
          </p>
          <a
            href="https://github.com/racoci"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm"
          >
            {t.githubProfileBtn}
          </a>
        </div>
      ) : filteredRepos.length === 0 ? (
        // Nenhum resultado encontrado
        <div className="text-center py-10 text-zinc-500 dark:text-zinc-500 font-serif">
          {t.noReposFound.replace("{search}", search)}
        </div>
      ) : (
        // Lista carregada com sucesso
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 rounded-xl hover:border-emerald-500/50 dark:hover:border-emerald-400/30 hover:bg-emerald-500/[0.01] dark:hover:bg-emerald-400/[0.01] hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {repo.name}
                  </h3>
                  <svg
                    className="h-4 w-4 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm font-serif line-clamp-2 leading-relaxed">
                  {repo.description || t.noDescription}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/40 text-xs text-zinc-500 dark:text-zinc-500">
                {/* Linguagem principal */}
                <div className="flex items-center gap-1.5 font-medium">
                  {repo.language && (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      <span>{repo.language}</span>
                    </>
                  )}
                </div>

                {/* Stars e Forks */}
                <div className="flex items-center gap-3 font-mono">
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600"
                      viewBox="0 0 20 24"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="18" cy="18" r="3" />
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 15V9a4 4 0 00-4-4H9" />
                      <path d="M6 9v6" />
                    </svg>
                    {repo.forks_count}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
