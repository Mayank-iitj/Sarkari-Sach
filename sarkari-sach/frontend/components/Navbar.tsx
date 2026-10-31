"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, BarChart3, Info, BookOpen, Layers, Globe, MessageCircle, Menu, X } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  lang: "hi" | "en";
  setLang: (lang: "hi" | "en") => void;
}

export default function Navbar({ lang, setLang }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", labelEn: "Verify", labelHi: "जाँचें", icon: ShieldCheck },
    { href: "/whatsapp", labelEn: "WhatsApp Bot", labelHi: "व्हाट्सएप बॉट", icon: MessageCircle },
    { href: "/schemes", labelEn: "Schemes", labelHi: "योजनाएं", icon: Layers },
    { href: "/sources", labelEn: "Registry", labelHi: "स्रोत", icon: Globe },
    { href: "/documents", labelEn: "Corpus", labelHi: "राजपत्र", icon: BookOpen },
    { href: "/eval", labelEn: "Eval & Benchmarks", labelHi: "सटीकता", icon: BarChart3 },
    { href: "/about", labelEn: "About", labelHi: "नियम शून्य", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-canvas-line">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-ink tracking-tight flex items-center gap-1.5">
              Sarkari Sach <span className="text-[10px] font-bold text-brand-accent bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">2.0</span>
            </span>
            <p className="text-[10px] sm:text-[11px] text-ink-subtle -mt-1 hidden sm:block">
              Primary Source Verifier · Central Government
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-brand/10 text-brand font-bold"
                    : "text-ink-subtle hover:text-brand hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-brand" : "text-ink-subtle"}`} />
                <span>{lang === "en" ? item.labelEn : item.labelHi}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Language Toggle & Mobile Menu button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "hi" ? "en" : "hi")}
            className="px-3 py-1 rounded-full text-xs font-bold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-1"
            title={lang === "en" ? "Switch to Hindi (हिन्दी)" : "Switch to English"}
          >
            <span className={lang === "en" ? "underline underline-offset-2" : "opacity-75"}>EN</span>
            <span className="opacity-40">/</span>
            <span className={lang === "hi" ? "underline underline-offset-2" : "opacity-75"}>हिन्दी</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-ink-subtle hover:text-ink hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-canvas-line bg-white px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand/10 text-brand font-bold"
                    : "text-ink-subtle hover:text-brand hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-brand" : "text-ink-subtle"}`} />
                <span>{lang === "en" ? item.labelEn : item.labelHi}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
