import React from "react";

interface BadgeProps {
  children: React.ReactNode;
}

function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
      {children}
    </span>
  );
}

export default function ProjectCaseStudy() {
  return (
    <div className="space-y-12">
      {/* Header Section */}
      <header className="space-y-4 border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge>Next.js (App Router)</Badge>
          <Badge>TypeScript</Badge>
          <Badge>Tailwind CSS</Badge>
          <Badge>MDX</Badge>
          <Badge>Edge Caching</Badge>
          <Badge>APIs Públicas</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Screener B3 - Painel Quantitativo de Fundamentos
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed">
          Um painel analítico de alta performance para triagem de ativos financeiros da B3, desenvolvido sem custos de infraestrutura no backend, com ordenação adaptada à lógica de negócios real do mercado.
        </p>
      </header>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Main Content */}
        <div className="md:col-span-8 space-y-10">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">#</span> Visão Geral
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed">
              O <strong>Screener B3</strong> não é um simples CRUD ou visualizador de cotações; ele resolve problemas complexos de infraestrutura e regras de negócios do mercado financeiro. Construído como uma aplicação robusta de frontend que transfere o processamento analítico pesado diretamente para o cliente, permitindo uma análise quantitativa em tempo real e de baixo custo. O projeto também aproveita o poder do MDX para renderizar relatórios narrativos e teses de investimento de forma fluida.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">#</span> Desafios Técnicos Resolvidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 rounded-xl space-y-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Motor de Cache Customizado
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-serif">
                  Desenvolvimento de um mecanismo de cache no <code>localStorage</code> com validação de TTL de 24 horas, zerando as requisições redundantes a APIs externas e melhorando a latência de carregamento.
                </p>
              </div>
              <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 rounded-xl space-y-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Algoritmos de Ordenação Financeira
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-serif">
                  Sobrescrita de ordenações matemáticas triviais para refletir a lógica real: no caso do índice P/L, empresas em prejuízo (P/L negativo) são forçadas para o final da fila em vez de liderarem o ranking.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">#</span> Visão de Mercado e Filosofia
            </h2>
            <div className="prose dark:prose-invert prose-emerald max-w-none font-serif">
              <p>
                As ferramentas analíticas raramente estabilizam o mercado; elas apenas aceleram a sua adaptação. Este projeto foi desenhado sob o entendimento fundamental de que a tecnologia preditiva não cria estabilidade. Pelo contrário: <strong>cada aumento na capacidade de previsão torna o mercado restante mais imprevisível</strong>.
              </p>
              <p>
                À medida que os agentes econômicos agem de forma cada vez mais rápida sobre as assimetrias apontadas pelos algoritmos, gera-se uma instabilidade estrutural impulsionada pelo princípio de reflexividade. O <em>Screener B3</em> é uma ferramenta para operar dentro deste caos hiper-competitivo de maneira informada.
              </p>
            </div>
          </section>

        </div>

        {/* Sidebar */}
        <aside className="md:col-span-4 space-y-8">
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              Arquitetura Zero Infra
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-serif mb-4 leading-relaxed">
              Como contornar bloqueios de CORS e reduzir custos com backend na nuvem? 
            </p>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Processamento deslocado 100% para o cliente (Edge/Client Computing).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Uso inteligente de APIs financeiras abertas sem necessidade de proxies.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Custo zero em servidores, alta disponibilidade instantânea.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              Stack Utilizada
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge>Next.js 15+</Badge>
              <Badge>App Router</Badge>
              <Badge>TypeScript</Badge>
              <Badge>Tailwind CSS v4</Badge>
              <Badge>MDX</Badge>
              <Badge>LocalStorage</Badge>
              <Badge>Edge Caching</Badge>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
