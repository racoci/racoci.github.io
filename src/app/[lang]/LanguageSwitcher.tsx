"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface LanguageSwitcherProps {
  currentLang: string;
}

export default function LanguageSwitcher({ currentLang }: LanguageSwitcherProps) {
  const pathname = usePathname();

  const getLanguagePath = (targetLang: string) => {
    if (!pathname) return `/${targetLang}`;
    const segments = pathname.split("/");
    // segments[0] is empty, segments[1] is the current lang
    segments[1] = targetLang;
    return segments.join("/");
  };

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
      <Link
        href={getLanguagePath("en")}
        className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
          currentLang === "en"
            ? "text-emerald-600 dark:text-emerald-400 font-bold"
            : ""
        }`}
      >
        EN
      </Link>
      <span className="text-zinc-300 dark:text-zinc-800">/</span>
      <Link
        href={getLanguagePath("pt")}
        className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
          currentLang === "pt"
            ? "text-emerald-600 dark:text-emerald-400 font-bold"
            : ""
        }`}
      >
        PT
      </Link>
    </div>
  );
}
