"use client";

import React, { useState, useEffect } from 'react';

export default function HoldsKernelWidget() {
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const holdsUrl = "https://racoci.github.io/racoci-core/";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative w-full h-[680px] bg-zinc-950 rounded-2xl border border-zinc-800/60 dark:border-zinc-800/40 shadow-2xl overflow-hidden flex flex-col items-center justify-center font-mono">
        <div className="relative w-12 h-10 mb-4 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
        <span className="text-emerald-500 text-xs animate-pulse tracking-[0.2em] font-bold">
          INITIALIZING HOLDS SUBSTRATE...
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[680px] bg-zinc-950 rounded-2xl border border-zinc-800/60 dark:border-zinc-800/40 shadow-2xl overflow-hidden transition-all duration-300 hover:border-zinc-700/60">
      
      {/* High-Fidelity Cyber Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 font-mono">
          <div className="relative w-12 h-10 mb-4 flex items-center justify-center">
            {/* Pulsing Outer Rings */}
            <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-full animate-ping"></div>
            {/* Spinning Neon Core */}
            <div className="w-8 h-8 border-[3px] border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <span className="text-emerald-500 text-xs animate-pulse tracking-[0.2em] font-bold">
            INITIALIZING HOLDS SUBSTRATE...
          </span>
          <span className="text-[10px] text-zinc-500 tracking-widest uppercase mt-1">
            Loading Svelte UI & WebAssembly Web worker
          </span>
        </div>
      )}

      {/* Sandboxed Isolation Viewport */}
      <iframe
        src={holdsUrl}
        className="w-full h-full border-none block"
        title="Holds Substrate Live Kernel UI"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
        loading="lazy"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
