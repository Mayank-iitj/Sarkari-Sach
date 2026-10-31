"use client";

import Link from "next/link";
import { ShieldCheck, BarChart3, Info } from "lucide-react";

interface NavbarProps {
  lang: "hi" | "en";
  setLang: (lang: "hi" | "en") => void;
}

export default function Navbar({ lang, setLang }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-canvas-line">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-ink tracking-tight flex items-center gap-1.5">
              Sarkari Sach <span className="text-xs font-normal text-brand-accent bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">2.0</span>
            </span>
            <p className="text-[11px] text-ink-subtle -mt-1 hidden sm:block">
              Primary Source Verifier · Central Government
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/eval"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-ink-subtle hover:text-brand hover:bg-slate-100 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Accuracy & Eval</span>
            <span className="sm:hidden">Eval</span>
          </Link>
          <Link
            href="/about"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-ink-subtle hover:text-brand hover:bg-slate-100 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">About & Rules</span>
            <span className="sm:hidden">About</span>
          </Link>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "hi" ? "en" : "hi")}
            className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-1"
            title={lang === "en" ? "Switch to Hindi (हिन्दी)" : "Switch to English"}
          >
            <span className={lang === "en" ? "font-bold underline" : "opacity-80"}>EN</span>
            <span className="opacity-50">/</span>
            <span className={lang === "hi" ? "font-bold underline" : "opacity-80"}>हिन्दी</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
