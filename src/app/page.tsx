export default function Home() {
  return (
    <div className="space-y-8 font-sans">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          Jardim Digital de Lucas Racoci
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif text-lg leading-relaxed">
          Este espaço está passando por uma reestruturação e migração completa para uma arquitetura estática moderna usando Next.js 16, Tailwind CSS v4 e MDX.
        </p>
      </div>

      {/* Alerta de Construção / Desenvolvimento */}
      <div className="p-5 border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-500/5 dark:bg-amber-500/[0.02] rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
          <span className="text-xl">⚠️</span>
          <span>Página Principal em Desenvolvimento / Under Construction</span>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-serif leading-relaxed">
          Esta página inicial é um placeholder temporário servindo como prova de conceito para testar o fluxo de integração e publicação contínua (CI/CD) no GitHub Pages. Novas seções e artigos serão plantados e cultivados aqui nos próximos dias.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Semeando o Jardim
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed">
          Embora a home principal esteja em construção, algumas ramificações essenciais já foram estabelecidas e podem ser exploradas no menu superior:
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0">
          <li className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-xl flex flex-col justify-between m-0">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1">Sobre</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-serif leading-normal m-0">
                Uma síntese profissional de competências, filosofia e pilares de atuação técnica.
              </p>
            </div>
            <a href="/sobre" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block">
              Acessar Sobre →
            </a>
          </li>

          <li className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-xl flex flex-col justify-between m-0">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1">Agora (/now)</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-serif leading-normal m-0">
                Focos de estudo ativos, obsessões intelectuais atuais e leituras correntes.
              </p>
            </div>
            <a href="/agora" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block">
              Acessar Agora →
            </a>
          </li>

          <li className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-xl flex flex-col justify-between m-0">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1">Projetos</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-serif leading-normal m-0">
                Listagem dinâmica de repositórios públicos e utilitários mantidos no GitHub.
              </p>
            </div>
            <a href="/projetos" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block">
              Acessar Projetos →
            </a>
          </li>
        </ul>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          Próximos Passos (Backlog de Cultivo)
        </h2>
        <ul className="space-y-2 text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed text-sm list-disc pl-5">
          <li><strong>⚙️ Sistemas:</strong> Adicionar notas detalhadas de engenharia reversa de firmware base MediaTek.</li>
          <li><strong>🧠 Lógica:</strong> Estruturar o ensaio sobre reflexividade de mercado de crenças.</li>
          <li><strong>🧪 Laboratório:</strong> Publicar receitas de formulação botânica e checklists de montanhismo.</li>
        </ul>
      </div>
    </div>
  );
}
