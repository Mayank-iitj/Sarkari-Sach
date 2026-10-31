"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import { ALL_MYSCHEME_ITEMS } from "@/lib/schemes_data";
import {
  Search,
  Layers,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Tag,
  CheckCircle2,
} from "lucide-react";

interface Scheme {
  id: string;
  name: string;
  name_aliases: string[];
  issuer: string | null;
}

interface LiveSearchResult {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provisions: Array<{ field: string; value: string; quote: string }>;
  is_official: boolean;
}

const CATEGORIES = [
  "All",
  "Agriculture",
  "Health",
  "Energy",
  "Housing",
  "Finance",
  "Skills",
  "Social",
  "Education",
];

export default function SchemesDirectoryPage() {
  const [lang, setLang] = useState<"hi" | "en">("en");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<LiveSearchResult[]>([]);

  // Fetch local schemes list from API
  useEffect(() => {
    async function loadSchemes() {
      try {
        const res = await fetch(getApiUrl("/v1/schemes"));
        if (res.ok) {
          const data = await res.json();
          setSchemes(data);
        }
      } catch (err) {
        console.error("Error loading schemes:", err);
      }
    }
    loadSchemes();
  }, []);

  // Trigger live web search across official government portals
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;

    setLoading(true);
    setLiveSearching(true);
    try {
      const res = await fetch(getApiUrl(`/v1/schemes/live-search?q=${encodeURIComponent(query)}`));
      if (res.ok) {
        const results = await res.json();
        setLiveResults(results);
      }
    } catch (err) {
      console.error("Live search failed:", err);
    } finally {
      setLoading(false);
      setLiveSearching(false);
    }
  };

  const filteredSchemes = ALL_MYSCHEME_ITEMS.filter((s) => {
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
    const matchesQuery =
      !query ||
      s.nameEn.toLowerCase().includes(query.toLowerCase()) ||
      s.nameHi.includes(query) ||
      s.benefit.toLowerCase().includes(query.toLowerCase()) ||
      s.issuer.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>
              {lang === "en"
                ? "National myScheme Repository & Lineage Registry"
                : "राष्ट्रीय myScheme डायरेक्टरी व संशोधन रजिस्ट्री"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-tight">
            {lang === "en"
              ? "Official Government Schemes (myScheme.gov.in)"
              : "अधिकृत सरकारी योजनाओं की सत्यता जांचें"}
          </h1>

          <p className="text-xs sm:text-sm text-ink-subtle leading-relaxed">
            {lang === "en"
              ? "Explore 20+ flagship Central Government schemes ingested directly from myscheme.gov.in, Gazette notifications, and ministry registries. Compare authorized benefits, statutory zero-fee guarantees, and official portals to protect against viral misinformation."
              : "myScheme.gov.in और भारत के राजपत्र से सत्यापित 20+ प्रमुख केंद्रीय योजनाएं। फर्जी दावों से बचने के लिए वास्तविक लाभ, पात्रता और आधिकारिक पोर्टल्स देखें।"}
          </p>
        </div>

        {/* Live Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-subtle absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === "en"
                  ? "Search schemes (e.g. PM Kisan, Surya Ghar, Ayushman, Mudra)..."
                  : "योजना खोजें (जैसे पीएम किसान, सूर्य घर, आयुष्मान, मुद्रा)..."
              }
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-canvas-line text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition-all disabled:opacity-60 shadow-sm flex-shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{lang === "en" ? "Live Search (.gov.in)" : "लाइव खोज (.gov.in)"}</span>
          </button>
        </form>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-brand text-white shadow-sm"
                  : "bg-white text-ink-subtle border border-canvas-line hover:text-ink hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Official Search Results (If Searched) */}
        {liveResults.length > 0 && (
          <div className="bg-white rounded-3xl border border-blue-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-canvas-line">
              <div className="flex items-center gap-2 text-brand">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-ink">
                  {lang === "en" ? "Live Official Government Results (.gov.in)" : "लाइव सरकारी पोर्टल परिणाम (.gov.in)"}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {liveResults.length} {lang === "en" ? "Official Portals Verified" : "सत्यापित स्रोत"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveResults.map((r, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-ink leading-snug line-clamp-1">{r.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 flex-shrink-0">
                      {r.domain}
                    </span>
                  </div>
                  <p className="text-xs text-ink-subtle line-clamp-2">{r.snippet}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-brand hover:underline inline-flex items-center gap-1"
                    >
                      <span>Visit Official Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <Link
                      href={`/?q=${encodeURIComponent(r.title)}`}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-ink hover:bg-slate-100 transition-colors shadow-sm"
                    >
                      Verify Message
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Curated Official Schemes Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>
                {lang === "en" ? "Authorized Schemes Directory" : "अधिकृत सरकारी योजनाओं की सूची"}
              </span>
              <span className="text-xs font-bold bg-slate-100 text-ink-subtle px-2 py-0.5 rounded-full">
                {filteredSchemes.length}
              </span>
            </h2>
            <span className="text-xs text-ink-subtle">
              Source: <strong className="text-ink">myscheme.gov.in</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-3xl border border-canvas-line p-5 flex flex-col justify-between hover:shadow-md hover:border-brand/40 transition-all space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                      {scheme.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {scheme.fee.includes("Zero") || scheme.fee.includes("Free") ? "Free / निःशुल्क" : "Nominal"}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-ink leading-snug">
                    {lang === "hi" ? scheme.nameHi : scheme.nameEn}
                  </h3>

                  <p className="text-[11px] text-ink-subtle line-clamp-1">
                    {scheme.issuer}
                  </p>
                </div>

                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="font-bold text-ink block text-[11px] uppercase tracking-wider">
                      {lang === "en" ? "Official Benefit:" : "सरकारी लाभ:"}
                    </span>
                    <span className="text-ink-subtle text-xs line-clamp-2">
                      {scheme.benefit}
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="font-bold text-ink block text-[11px] uppercase tracking-wider">
                      {lang === "en" ? "Eligibility:" : "पात्रता:"}
                    </span>
                    <span className="text-ink-subtle text-xs line-clamp-2">
                      {scheme.eligibility}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-canvas-line text-xs">
                  <Link
                    href={`/schemes/${scheme.id}`}
                    className="font-bold text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <span>{lang === "en" ? "View Lineage" : "संशोधन देखें"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  <a
                    href={scheme.mySchemeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-subtle hover:text-ink inline-flex items-center gap-1"
                  >
                    <span>myScheme</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
