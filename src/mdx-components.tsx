import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import React from 'react';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Títulos Semânticos e Estilizados
    h1: ({ children, ...props }) => (
      <h1 
        className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-10 mb-4 font-sans" 
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 
        className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-8 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2 font-sans" 
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 
        className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-6 mb-2 font-sans" 
        {...props}
      >
        {children}
      </h3>
    ),
    
    // Parágrafos e Corpo de Texto de Alta Legibilidade
    p: ({ children, ...props }) => (
      <p 
        className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-5 text-[1.05rem] font-serif" 
        {...props}
      >
        {children}
      </p>
    ),
    
    // Links Internos/Externos Inteligentes
    a: ({ href, children, ...props }) => {
      const isInternal = href?.startsWith('/') || href?.startsWith('#');
      
      if (isInternal) {
        return (
          <Link 
            href={href || '#'} 
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-4 decoration-2 decoration-emerald-500/30 hover:decoration-emerald-500 transition-colors font-medium"
            {...props}
          >
            {children}
          </Link>
        );
      }
      
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-4 decoration-2 decoration-emerald-500/30 hover:decoration-emerald-500 transition-colors font-medium inline-flex items-center gap-0.5"
          {...props}
        >
          {children}
        </a>
      );
    },
    
    // Listas e Elementos
    ul: ({ children, ...props }) => (
      <ul 
        className="list-disc pl-6 mb-5 space-y-2 text-zinc-700 dark:text-zinc-300 text-[1.025rem] font-serif" 
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol 
        className="list-decimal pl-6 mb-5 space-y-2 text-zinc-700 dark:text-zinc-300 text-[1.025rem] font-serif" 
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed pl-1" {...props}>
        {children}
      </li>
    ),
    
    // Bloco de Notas / Citações Orgânicas (Estilo Jardim Digital)
    blockquote: ({ children, ...props }) => (
      <blockquote 
        className="border-l-4 border-emerald-500 dark:border-emerald-400 pl-4 italic my-6 text-zinc-700 dark:text-zinc-300 bg-emerald-500/5 dark:bg-emerald-400/5 py-3 pr-3 rounded-r-lg font-serif"
        {...props}
      >
        {children}
      </blockquote>
    ),
    
    // Blocos e Tags de Código
    pre: ({ children, ...props }) => (
      <pre 
        className="bg-zinc-900 text-zinc-100 p-4 rounded-xl overflow-x-auto my-6 font-mono text-sm leading-relaxed border border-zinc-800 dark:border-zinc-800/50 shadow-inner"
        {...props}
      >
        {children}
      </pre>
    ),
    code: ({ children, ...props }) => (
      <code 
        className="bg-zinc-100 dark:bg-zinc-800/80 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-mono text-sm border border-zinc-200/50 dark:border-zinc-700/30"
        {...props}
      >
        {children}
      </code>
    ),
    
    // Divisores de Seção
    hr: (props) => (
      <hr 
        className="my-10 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800" 
        {...props}
      />
    ),
    
    // Tabelas Responsivas Estilizadas
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-6 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm font-sans" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th 
        className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider" 
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td 
        className="px-4 py-3 text-zinc-700 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-800" 
        {...props}
      >
        {children}
      </td>
    ),
    
    ...components,
  };
}
