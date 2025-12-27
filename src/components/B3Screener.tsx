"use client";

import React, { useState, useEffect, useMemo } from "react";

interface StockData {
  ticker: string;
  nome: string;
  pl: number;
  roe: number;
  margem: number;
  divida: number;
}

interface B3ScreenerProps {
  lang: "en" | "pt";
}

const CACHE_KEY = "b3_screener_dados";
const TEMPO_CACHE_HORAS = 24;

const dict = {
  en: {
    title: "Screener B3 — Real-Time Fundamentals",
    subtitle: "Statically served, dynamically processed entirely in the browser.",
    statusCache: "Loaded from Cache",
    statusApi: "Fetching from API...",
    statusInitial: "Initializing...",
    statusSuccess: "Updated & Saved to Cache",
    clearCacheBtn: "Reset Cache & Re-Fetch",
    thTicker: "Ticker",
    thCompany: "Company",
    thPL: "P/E (x)",
    thROE: "ROE (%)",
    thMargem: "Net Margin (%)",
    thDivida: "Debt/EBITDA",
    noData: "No data available.",
    cacheDetails: "localStorage Cache: 24h TTL. Saves bandwidth and eliminates backend servers.",
  },
  pt: {
    title: "Screener B3 — Fundamentos em Tempo Real",
    subtitle: "Servido estaticamente, processado dinamicamente no navegador.",
    statusCache: "Carregado do Cache",
    statusApi: "Buscando da API...",
    statusInitial: "Inicializando...",
    statusSuccess: "Atualizado & Salvo no Cache",
    clearCacheBtn: "Limpar Cache & Recarregar",
    thTicker: "Ticker",
    thCompany: "Empresa",
    thPL: "P/L (x)",
    thROE: "ROE (%)",
    thMargem: "Margem Líq. (%)",
    thDivida: "Dívida/EBITDA",
    noData: "Nenhum dado disponível.",
    cacheDetails: "Cache localStorage: 24h de TTL. Economiza banda e elimina servidores backend.",
  },
};

const mockStocks: StockData[] = [
  { ticker: "BBAS3", nome: "Banco do Brasil", pl: 4.2, roe: 21.5, margem: 15.3, divida: 0 },
  { ticker: "ITUB4", nome: "Itaú Unibanco", pl: 8.1, roe: 20.8, margem: 12.1, divida: 0 },
  { ticker: "BBSE3", nome: "BB Seguridade", pl: 8.5, roe: 65.4, margem: 85.2, divida: 0 },
  { ticker: "WEGE3", nome: "WEG", pl: 32.5, roe: 28.3, margem: 16.5, divida: -0.2 },
  { ticker: "PETR4", nome: "Petrobras", pl: 3.5, roe: 35.1, margem: 25.4, divida: 0.8 },
  { ticker: "VALE3", nome: "Vale", pl: 5.9, roe: 15.4, margem: 20.1, divida: 0.4 },
  { ticker: "MGLU3", nome: "Magazine Luiza", pl: -12.5, roe: -8.4, margem: -2.5, divida: 3.5 },
  { ticker: "BHIA3", nome: "Casas Bahia", pl: -4.2, roe: -25.1, margem: -5.8, divida: 5.1 },
  { ticker: "AMAR3", nome: "Lojas Marisa", pl: -2.1, roe: -45.0, margem: -10.2, divida: 8.5 },
];

export default function B3Screener({ lang }: B3ScreenerProps) {
  const t = dict[lang];

  const [dados, setDados] = useState<StockData[]>([]);
  const [status, setStatus] = useState<"initial" | "api" | "cache" | "success">("initial");
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockData; direction: "asc" | "desc" }>({
    key: "pl",
    direction: "asc",
  });

  const simularApiB3 = (): Promise<StockData[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockStocks);
      }, 1500);
    });
  };

  const carregarDados = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { dados: cachedDados, validade } = JSON.parse(cached);
          const agora = new Date().getTime();
          if (agora < validade) {
            setDados(cachedDados);
            setStatus("cache");
            return;
          }
        } catch (e) {
          // Se falhar o parse, remove do cache
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    setStatus("api");
    const novosDados = await simularApiB3();
    const validade = new Date().getTime() + TEMPO_CACHE_HORAS * 60 * 60 * 1000;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ dados: novosDados, validade }));
    setDados(novosDados);
    setStatus("success");
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSort = (key: keyof StockData) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedDados = useMemo(() => {
    if (!sortConfig.key) return dados;

    return [...dados].sort((a, b) => {
      let valorA = a[sortConfig.key];
      let valorB = b[sortConfig.key];

      // Custom Financial Logic: Companies with negative P/E (prejuízo) always go to the bottom when sorting ascending
      if (sortConfig.key === "pl" && sortConfig.direction === "asc") {
        if (typeof valorA === "number" && valorA < 0) valorA = 99999;
        if (typeof valorB === "number" && valorB < 0) valorB = 99999;
      }

      if (typeof valorA === "string" && typeof valorB === "string") {
        return sortConfig.direction === "asc"
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      if (typeof valorA === "number" && typeof valorB === "number") {
        return sortConfig.direction === "asc" ? valorA - valorB : valorB - valorA;
      }

      return 0;
    });
  }, [dados, sortConfig]);

  const handleClearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    carregarDados(true);
  };

  const getStatusBadgeStyle = () => {
    switch (status) {
      case "cache":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "api":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse";
      case "success":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "cache":
        return t.statusCache;
      case "api":
        return t.statusApi;
      case "success":
        return t.statusSuccess;
      default:
        return t.statusInitial;
    }
  };

  const formatarNumero = (num: number) => {
    return num.toLocaleString(lang === "pt" ? "pt-BR" : "en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-serif leading-relaxed">
            {t.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${getStatusBadgeStyle()}`}>
            {getStatusText()}
          </span>
          <button
            onClick={handleClearCache}
            className="inline-flex items-center px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            {t.clearCacheBtn}
          </button>
        </div>
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-inner bg-zinc-50/50 dark:bg-zinc-950/20">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm font-sans">
          <thead>
            <tr>
              {[
                { key: "ticker", label: t.thTicker },
                { key: "nome", label: t.thCompany },
                { key: "pl", label: t.thPL },
                { key: "roe", label: t.thROE },
                { key: "margem", label: t.thMargem },
                { key: "divida", label: t.thDivida },
              ].map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key as keyof StockData)}
                  className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/60 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.label}</span>
                    {sortConfig.key === column.key && (
                      <span className="text-emerald-500 dark:text-emerald-400">
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-transparent">
            {sortedDados.length > 0 ? (
              sortedDados.map((row) => {
                const isPLNegative = row.pl < 0;
                const isROENegative = row.roe < 0;
                const isMargemNegative = row.margem < 0;
                const isDividaHigh = row.divida > 3;
                const isDividaNegative = row.divida <= 0;

                return (
                  <tr
                    key={row.ticker}
                    className="hover:bg-zinc-500/[0.02] dark:hover:bg-zinc-100/[0.01] transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {row.ticker}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {row.nome}
                    </td>
                    <td
                      className={`px-4 py-3.5 font-mono ${
                        isPLNegative ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {formatarNumero(row.pl)}
                    </td>
                    <td
                      className={`px-4 py-3.5 font-mono font-semibold ${
                        isROENegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatarNumero(row.roe)}%
                    </td>
                    <td
                      className={`px-4 py-3.5 font-mono font-semibold ${
                        isMargemNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatarNumero(row.margem)}%
                    </td>
                    <td
                      className={`px-4 py-3.5 font-mono ${
                        isDividaHigh
                          ? "text-rose-600 dark:text-rose-400 font-semibold"
                          : isDividaNegative
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {formatarNumero(row.divida)}x
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  {status === "api" ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      <span>{t.statusApi}</span>
                    </div>
                  ) : (
                    t.noData
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info text */}
      <div className="text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-serif leading-relaxed">
          {t.cacheDetails}
        </p>
      </div>
    </div>
  );
}
