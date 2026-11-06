import Link from "next/link";
import InteractiveHero from "../../components/InteractiveHero";
import SudokuMiniWidget from "../../components/SudokuMiniWidget";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const dict = {
  en: {
    title: "Lucas Racoci",
    subtitle: "Digital Garden, Mathematical Logic & Systems Architecture",
    intro:
      "An open digital clearing exploring formal mathematical verification, computational geometry, post-quantum cryptography, and reactive distributed systems.",
    
    // Featured Projects Section
    featuredSectionTitle: "Featured Engineering & Research",
    featuredSectionDesc:
      "Selected open-source projects, formal verification systems, and interactive computation engines developed across my GitHub ecosystem:",
    
    viewAllProjects: "Explore All Repositories & Demos →",
    viewCaseStudy: "Case Study",
    viewOnGithub: "Source Code",

    // Featured Project Items
    projLeanTitle: "Lean AI Workspace",
    projLeanBadge: "Lean 4 & Svelte 5",
    projLeanDesc:
      "A client-side formal theorem proving IDE augmented by artificial intelligence. Runs mathematical verification via WebAssembly workers with zero server infrastructure and local-first telemetry.",

    projSpectralTitle: "Spectral",
    projSpectralBadge: "Rust WASM & Svelte",
    projSpectralDesc:
      "A bit-perfect, lossless audio-to-image conversion sandbox and interactive spectral editor powered by high-performance Rust WebAssembly kernels.",

    projMetaethicsTitle: "Metaethics (Unitary Normative Core)",
    projMetaethicsBadge: "Lean 4 & Isabelle/HOL",
    projMetaethicsDesc:
      "A mechanically verified metatheory of normativity proving theorems of deontic equivalence, bridge constraints, and normative bisimulation invariance to systematically formalize philosophical positions.",

    projSymforgeTitle: "SymForge",
    projSymforgeBadge: "Symbolic AI & Python",
    projSymforgeDesc:
      "A symbolic program synthesis framework that constructs and refines programs from formal grammars and domain primitives, optimizing structure and Kolmogorov complexity (MDL).",

    projNodegraftTitle: "NodeGraft / PolyGraft 3D",
    projNodegraftBadge: "WebGPU Compute Shaders",
    projNodegraftDesc:
      "An in-browser procedural 3D modeling engine evaluating Signed Distance Fields (SDF) and extracting polygon meshes in real-time via Dual Contouring compute shaders.",

    projPasswordTitle: "Password Manager & Crypto-Vault",
    projPasswordBadge: "AES-GCM & PBKDF2",
    projPasswordDesc:
      "An offline-first, zero-knowledge deterministic password generator and encrypted secrets vault featuring 600,000 PBKDF2-HMAC-SHA256 stretching rounds.",

    // Core Exploration Nodes
    branchesTitle: "Knowledge Clearing & Exploration Nodes",
    branchesDesc:
      "Navigate through the theoretical essays, architectural case studies, and interactive tools cultivated in this garden:",

    nodeEssaysTitle: "Essays & Mathematical Logic",
    nodeEssaysDesc:
      "Interactive essays covering the Constructive Fundamental Theorem of Algebra, Pythagorean Trees, the SIKE isogeny collapse, and 3D tensor calculus.",
    nodeEssaysLink: "Read Essays →",

    nodeSystemsTitle: "Systems & Infrastructure",
    nodeSystemsDesc:
      "Architectural studies on firmware reverse engineering, bare-metal virtualization, distributed event loops, and memory optimization.",
    nodeSystemsLink: "Explore Systems →",

    nodeFinanceTitle: "Quantitative Analytics",
    nodeFinanceDesc:
      "Fundamental screening and algorithmic financial modeling for B3 equities, operating entirely client-side with edge-cached datasets.",
    nodeFinanceLink: "Open Analytics →",

    nodeLabTitle: "Interactive Lab",
    nodeLabDesc:
      "Experimental playgrounds, procedural simulations, graphical algorithms, and algorithmic curiosities.",
    nodeLabLink: "Enter Lab →",

    nodeAboutTitle: "About & Principles",
    nodeAboutDesc:
      "Professional background, systems engineering principles, design philosophies, and personal contact.",
    nodeAboutLink: "About Lucas →",

    nodeNowTitle: "Now (/now)",
    nodeNowDesc:
      "Current intellectual focuses, research directions, and active reading logs.",
    nodeNowLink: "See What's Current →",

    // Research Frontiers
    frontiersTitle: "Current Research Frontiers",
    frontiersSubtitle:
      "Areas of ongoing investigation and mechanized exploration:",
    frontier1Title: "Automated Theorem Proving & Symbolic Synthesis",
    frontier1Desc:
      "Bridging interactive proof assistants (Lean 4) with generative guidance heuristics to accelerate formal verification of non-trivial mathematical theorems.",
    frontier2Title: "Continuous Tensor Calculus & WebGL Mechanisms",
    frontier2Desc:
      "Developing volumetric GPU-driven visualizations that illustrate how discrete algebraic operations converge to continuous field integrals.",
    frontier3Title: "Post-Quantum Cryptographic Surface Auditing",
    frontier3Desc:
      "Analyzing higher-genus abelian varieties, supersingular isogeny graphs, and side-channel resistance in lattice-based cryptography.",
  },
  pt: {
    title: "Lucas Racoci",
    subtitle: "Jardim Digital, Lógica Matemática & Arquitetura de Sistemas",
    intro:
      "Uma clareira digital aberta dedicada à exploração de verificação matemática formal, geometria computacional, criptografia pós-quântica e sistemas distribuídos reativos.",

    // Featured Projects Section
    featuredSectionTitle: "Engenharia & Pesquisa em Destaque",
    featuredSectionDesc:
      "Projetos selecionados de código aberto, sistemas de verificação formal e motores interativos desenvolvidos no meu ecossistema GitHub:",

    viewAllProjects: "Ver Todos os Repositórios & Projetos →",
    viewCaseStudy: "Estudo de Caso",
    viewOnGithub: "Código Fonte",

    // Featured Project Items
    projLeanTitle: "Lean AI Workspace",
    projLeanBadge: "Lean 4 & Svelte 5",
    projLeanDesc:
      "Uma IDE client-side de demonstração formal de teoremas aumentada por inteligência artificial. Executa a verificação matemática em WebAssembly via Web Workers com custo zero de servidor e telemetria local-first.",

    projSpectralTitle: "Spectral",
    projSpectralBadge: "Rust WASM & Svelte",
    projSpectralDesc:
      "Um sandbox de conversão de áudio para imagem bit-perfect sem perdas e editor espectral interativo alimentado por núcleos de alta performance em Rust WebAssembly.",

    projMetaethicsTitle: "Metaethics (Unitary Normative Core)",
    projMetaethicsBadge: "Lean 4 & Isabelle/HOL",
    projMetaethicsDesc:
      "Uma metateoria de normatividade mecanicamente verificada provando teoremas de equivalência deôntica, restrições de ponte e invariância de bisimulação normativa para formalizar posições filosóficas.",

    projSymforgeTitle: "SymForge",
    projSymforgeBadge: "IA Simbólica & Python",
    projSymforgeDesc:
      "Um framework de síntese de programas simbólicos que constrói e refina código a partir de gramáticas formais e primitivas de domínio, otimizando estrutura e complexidade de Kolmogorov (MDL).",

    projNodegraftTitle: "NodeGraft / PolyGraft 3D",
    projNodegraftBadge: "Compute Shaders em WebGPU",
    projNodegraftDesc:
      "Um motor procedural de modelagem 3D no navegador que avalia Campos de Distância com Sinal (SDF) e extrai malhas poligonais em tempo real via compute shaders de Dual Contouring.",

    projPasswordTitle: "Password Manager & Crypto-Vault",
    projPasswordBadge: "AES-GCM & PBKDF2",
    projPasswordDesc:
      "Um gerador de senhas determinístico offline-first de conhecimento zero e cofre de segredos criptografados com 600.000 rodadas de estiramento PBKDF2-HMAC-SHA256.",

    // Core Exploration Nodes
    branchesTitle: "Nós de Exploração & Clareiras do Jardim",
    branchesDesc:
      "Navegue através dos ensaios teóricos, estudos de caso de arquitetura e ferramentas interativas cultivadas neste jardim:",

    nodeEssaysTitle: "Ensaios & Lógica Matemática",
    nodeEssaysDesc:
      "Ensaios interativos cobrindo o Teorema Fundamental da Álgebra construtivo, Árvores Pitagóricas, a quebra de isogenias do SIKE e cálculo tensorial 3D.",
    nodeEssaysLink: "Ler Ensaios →",

    nodeSystemsTitle: "Sistemas & Infraestrutura",
    nodeSystemsDesc:
      "Estudos arquiteturais sobre engenharia reversa de firmware, virtualização bare-metal, loops de eventos distribuídos e otimização de memória.",
    nodeSystemsLink: "Explorar Sistemas →",

    nodeFinanceTitle: "Análise Quantitativa",
    nodeFinanceDesc:
      "Triagem fundamentalista e modelagem quantitativa para ações da B3, operando totalmente no cliente com dados cacheados na borda.",
    nodeFinanceLink: "Abrir Screener →",

    nodeLabTitle: "Laboratório Interativo",
    nodeLabDesc:
      "Playgrounds experimentais, simulações procedurais, algoritmos gráficos e investigações numéricas.",
    nodeLabLink: "Entrar no Laboratório →",

    nodeAboutTitle: "Sobre & Princípios",
    nodeAboutDesc:
      "Trajetória profissional, princípios de engenharia de software, filosofia de design e contato pessoal.",
    nodeAboutLink: "Sobre Lucas →",

    nodeNowTitle: "Agora (/now)",
    nodeNowDesc:
      "Focos intelectuais correntes, linhas de pesquisa ativas e leituras recentes.",
    nodeNowLink: "Ver O Que Há de Novo →",

    // Research Frontiers
    frontiersTitle: "Fronteiras Atuais de Pesquisa",
    frontiersSubtitle:
      "Áreas de investigação contínua e exploração formal:",
    frontier1Title: "Provas Automatizadas & Síntese Simbólica",
    frontier1Desc:
      "Conectando assistentes de prova interativos (Lean 4) com heurísticas de orientação generativa para acelerar a verificação formal de teoremas matemáticos não-triviais.",
    frontier2Title: "Cálculo Tensorial Contínuo & Mecânica WebGL",
    frontier2Desc:
      "Desenvolvendo visualizações volumétricas em GPU demonstrando como operações algébricas discretas convergem naturalmente para integrais de campos contínuos.",
    frontier3Title: "Auditoria Criptográfica de Superfícies Pós-Quânticas",
    frontier3Desc:
      "Análise de variedades abelianas de gênero superior, grafos de isogenias supersingulares e resistência a canais laterais em criptografia baseada em reticulados.",
  },
};

export default async function Home({ params }: PageProps) {
  const { lang } = await params;
  const isPt = lang === "pt";
  const t = isPt ? dict.pt : dict.en;

  const featuredProjects = [
    {
      title: t.projLeanTitle,
      badge: t.projLeanBadge,
      desc: t.projLeanDesc,
      githubUrl: "https://github.com/racoci/lean-ai-workspace",
      internalUrl: null,
    },
    {
      title: t.projSpectralTitle,
      badge: t.projSpectralBadge,
      desc: t.projSpectralDesc,
      githubUrl: "https://github.com/racoci/spectral",
      internalUrl: null,
    },
    {
      title: t.projMetaethicsTitle,
      badge: t.projMetaethicsBadge,
      desc: t.projMetaethicsDesc,
      githubUrl: "https://github.com/racoci/metaethics",
      internalUrl: null,
    },
    {
      title: t.projSymforgeTitle,
      badge: t.projSymforgeBadge,
      desc: t.projSymforgeDesc,
      githubUrl: "https://github.com/racoci/symforge",
      internalUrl: null,
    },
    {
      title: t.projNodegraftTitle,
      badge: t.projNodegraftBadge,
      desc: t.projNodegraftDesc,
      githubUrl: "https://github.com/racoci/node-graft",
      internalUrl: `/${lang}/projects/nodegraft`,
    },
    {
      title: t.projPasswordTitle,
      badge: t.projPasswordBadge,
      desc: t.projPasswordDesc,
      githubUrl: "https://github.com/racoci/password-manager",
      internalUrl: `/${lang}/projects/password-manager`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 font-sans">
      {/* Hero Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs uppercase tracking-widest font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-0.5 rounded-full">
            Autonomous Digital Garden
          </span>
          <span className="text-xs uppercase tracking-widest font-mono text-zinc-400">
            Next.js 16 • WebAssembly • MDX
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          {t.title}
        </h1>
        <p className="text-emerald-700 dark:text-emerald-400 font-mono text-sm md:text-base font-semibold mb-4">
          {t.subtitle}
        </p>
        <p className="text-zinc-600 dark:text-zinc-300 font-serif text-lg md:text-xl leading-relaxed">
          {t.intro}
        </p>
      </div>

      {/* Interactive Hero Visualizer */}
      <InteractiveHero lang={lang as "en" | "pt"} />

      {/* Featured Projects Grid */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t.featuredSectionTitle}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 font-serif text-sm mt-1">
              {t.featuredSectionDesc}
            </p>
          </div>
          <Link
            href={`/${lang}/projects`}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
          >
            {t.viewAllProjects}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredProjects.map((p, idx) => (
            <div
              key={idx}
              className="p-5 border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/20 hover:border-emerald-500/30 rounded-2xl flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base group-hover:text-emerald-500 transition-colors">
                    {p.title}
                  </h3>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                    {p.badge}
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                {p.internalUrl && (
                  <Link
                    href={p.internalUrl}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>{t.viewCaseStudy}</span>
                    <span>→</span>
                  </Link>
                )}
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>{t.viewOnGithub}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Micro-Widget */}
      <SudokuMiniWidget lang={lang as "en" | "pt"} />

      {/* Knowledge Clearing / Exploration Nodes */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.branchesTitle}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 font-serif text-sm mt-1">
            {t.branchesDesc}
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0 m-0">
          <li className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl flex flex-col justify-between m-0 hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <div>
              <div className="text-lg mb-2">📜</div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1.5 text-base">
                {t.nodeEssaysTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed m-0">
                {t.nodeEssaysDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/essays`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nodeEssaysLink}
            </Link>
          </li>

          <li className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl flex flex-col justify-between m-0 hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <div>
              <div className="text-lg mb-2">⚙️</div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1.5 text-base">
                {t.nodeSystemsTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed m-0">
                {t.nodeSystemsDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/systems`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nodeSystemsLink}
            </Link>
          </li>

          <li className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl flex flex-col justify-between m-0 hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <div>
              <div className="text-lg mb-2">📈</div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1.5 text-base">
                {t.nodeFinanceTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed m-0">
                {t.nodeFinanceDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/finance`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nodeFinanceLink}
            </Link>
          </li>

          <li className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl flex flex-col justify-between m-0 hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <div>
              <div className="text-lg mb-2">🧪</div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1.5 text-base">
                {t.nodeLabTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed m-0">
                {t.nodeLabDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/lab`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nodeLabLink}
            </Link>
          </li>

          <li className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl flex flex-col justify-between m-0 hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <div>
              <div className="text-lg mb-2">🧭</div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1.5 text-base">
                {t.nodeAboutTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed m-0">
                {t.nodeAboutDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/about`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nodeAboutLink}
            </Link>
          </li>

          <li className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 rounded-2xl flex flex-col justify-between m-0 hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <div>
              <div className="text-lg mb-2">⏳</div>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 m-0 mb-1.5 text-base">
                {t.nodeNowTitle}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-serif leading-relaxed m-0">
                {t.nodeNowDesc}
              </p>
            </div>
            <Link
              href={`/${lang}/now`}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-4 inline-block"
            >
              {t.nodeNowLink}
            </Link>
          </li>
        </ul>
      </section>

      {/* Current Research Frontiers */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8 space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.frontiersTitle}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-serif text-sm">
            {t.frontiersSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200/80 dark:border-zinc-800/60 rounded-xl space-y-1.5">
            <h3 className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 font-mono uppercase tracking-wider">
              {t.frontier1Title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs font-serif leading-relaxed">
              {t.frontier1Desc}
            </p>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200/80 dark:border-zinc-800/60 rounded-xl space-y-1.5">
            <h3 className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 font-mono uppercase tracking-wider">
              {t.frontier2Title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs font-serif leading-relaxed">
              {t.frontier2Desc}
            </p>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200/80 dark:border-zinc-800/60 rounded-xl space-y-1.5">
            <h3 className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 font-mono uppercase tracking-wider">
              {t.frontier3Title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs font-serif leading-relaxed">
              {t.frontier3Desc}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
