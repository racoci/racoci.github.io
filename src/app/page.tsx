"use client";

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    const userLang = navigator.language?.startsWith("pt") ? "pt" : "en";
    window.location.replace(`/${userLang}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-sans">
          Redirecting / Redirecionando...
        </p>
      </div>
    </div>
  );
}
