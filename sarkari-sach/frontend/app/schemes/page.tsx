"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import { Search, Layers, ExternalLink, ArrowRight, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

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

const POPULAR_SCHEMES = [
  {
    id: "pm-kisan",
    nameEn: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    nameHi: "प्रधानमंत्री किसान सम्मान निधि",
    issuer: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹6,000 / year (3 installments of ₹2,000)",
    fee: "Zero / Free (निःशुल्क)",
    eligibility: "All landholding farmer families across India",
    portal: "pmkisan.gov.in",
    portalUrl: "https://pmkisan.gov.in",
  },
  {
    id: "ayushman-bharat",
    nameEn: "Ayushman Bharat PM-JAY",
    nameHi: "आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना",
    issuer: "National Health Authority (NHA) / MoHFW",
    benefit: "₹5,00,000 per family per year for secondary/tertiary care",
    fee: "Zero / Free (निःशुल्क)",
    eligibility: "Bottom 40% vulnerable families (SECC 2011)",
    portal: "nha.gov.in / beneficiary.nha.gov.in",
    portalUrl: "https://nha.gov.in",
  },
  {
    id: "sukanya-samriddhi",
    nameEn: "Sukanya Samriddhi Yojana (SSA)",
    nameHi: "सुकन्या समृद्धि योजना",
    issuer: "Ministry of Finance / India Post",
    benefit: "High government-backed interest for girl child savings",
    fee: "Minimum deposit ₹250 / year",
    eligibility: "Girl children below 10 years of age",
    portal: "india.gov.in",
    portalUrl: "https://www.india.gov.in",
  },
  {
    id: "pm-vishwakarma",
    nameEn: "PM Vishwakarma Scheme",
    nameHi: "प्रधानमंत्री विश्वकर्मा योजना",
    issuer: "Ministry of MSME",
    benefit: "Collateral-free enterprise credit up to ₹3,00,000 at 5% interest + ₹15,000 toolkit",
    fee: "Free application at CSCs",
    eligibility: "Traditional artisans & craftspeople across 18 trades",
    portal: "pmvishwakarma.gov.in",
    portalUrl: "https://pmvishwakarma.gov.in",
  },
];

export default function SchemesDirectoryPage() {
  const [lang, setLang] = useState<"hi" | "en">("en");
  const [query, setQuery] = useState("");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<LiveSearchResult[]>([]);

  // Fetch local schemes list
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

  const filteredLocal = POPULAR_SCHEMES.filter(
    (s) =>
      !query ||
      s.nameEn.toLowerCase().includes(query.toLowerCase()) ||
      s.nameHi.includes(query) ||
      s.benefit.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Official Schemes & Lineage Registry" : "आधिकारिक योजना व संशोधन रजिस्ट्री"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            {lang === "en" ? "Explore Authorized Government Schemes" : "अधिकृत सरकारी योजनाओं की सत्यता जांचें"}
          </h1>

          <p className="text-xs sm:text-sm text-ink-subtle">
            {lang === "en"
              ? "Every scheme listed here is verified against gazette notifications, ministry circulars, and live official .gov.in portals. Track historical amendments, authentic amounts, and zero-fee guarantees."
              : "यहाँ दी गई सभी योजनाएं भारत के आधिकारिक राजपत्र, मंत्रालयों के परिपत्रों और .gov.in पोर्टल्स से सत्यापित हैं।"}
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
                  ? "Search schemes (e.g., PM Kisan, Ayushman Bharat, Vishwakarma)..."
                  : "योजना खोजें (जैसे पीएम किसान, आयुष्मान भारत, सुकन्या)..."
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

        {/* Live Search Results (If Searched) */}
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

                  {r.provisions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1.5">
                      {r.provisions.map((p, pidx) => (
                        <span key={pidx} className="text-[11px] font-semibold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                          {p.field.toUpperCase()}: {p.value}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                    >
                      <span>Visit Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <Link
                      href={`/?q=${encodeURIComponent(r.title)}`}
                      className="text-xs font-bold text-slate-700 hover:text-brand"
                    >
                      Verify Message →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Central Schemes Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">
              {lang === "en" ? "Official Central Government Schemes" : "प्रमुख केंद्रीय योजनाएं"}
            </h2>
            <span className="text-xs text-ink-subtle">
              {filteredLocal.length} {lang === "en" ? "Schemes Listed" : "योजनाएं"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredLocal.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-2xl border border-canvas-line p-5 shadow-sm space-y-4 hover:border-brand/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-ink leading-tight">
                        {lang === "en" ? scheme.nameEn : scheme.nameHi}
                      </h3>
                      <p className="text-xs text-ink-subtle mt-0.5">{scheme.issuer}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      Verified Active
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="text-ink-subtle font-medium min-w-[70px]">
                        {lang === "en" ? "Benefit:" : "लाभ:"}
                      </span>
                      <span className="font-bold text-ink">{scheme.benefit}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-ink-subtle font-medium min-w-[70px]">
                        {lang === "en" ? "Fee:" : "शुल्क:"}
                      </span>
                      <span className="font-bold text-emerald-700">{scheme.fee}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-ink-subtle font-medium min-w-[70px]">
                        {lang === "en" ? "Eligibility:" : "पात्रता:"}
                      </span>
                      <span className="text-ink">{scheme.eligibility}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-ink-subtle font-medium min-w-[70px]">
                        {lang === "en" ? "Portal:" : "वेबसाइट:"}
                      </span>
                      <a
                        href={scheme.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand font-mono hover:underline inline-flex items-center gap-1"
                      >
                        <span>{scheme.portal}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-canvas-line flex items-center justify-between gap-3">
                  <Link
                    href={`/schemes/${scheme.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                  >
                    <span>{lang === "en" ? "View Lineage & Gazette →" : "संशोधन इतिहास व राजपत्र →"}</span>
                  </Link>

                  <Link
                    href={`/?q=${encodeURIComponent(scheme.nameEn)}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-ink text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    {lang === "en" ? "Verify Claim" : "दावा जांचें"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Zero Explainer Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-brand flex-shrink-0" />
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-ink">
              {lang === "en" ? "The Rule Zero Guarantee" : "नियम शून्य की गारंटी"}
            </h4>
            <p className="text-xs text-ink-subtle leading-relaxed">
              {lang === "en"
                ? "No scheme benefit is ever confirmed without an exact Gazette Notification or PIB Fact Check record. If any viral message demands registration fees or directs to a non-.gov.in domain, it is immediately flagged as a forgery."
                : "बिना आधिकारिक सरकारी राजपत्र या पीआईबी तथ्य के किसी दावे की पुष्टि नहीं होती। यदि कोई मैसेज पंजीकरण शुल्क मांगता है, तो वह पूरी तरह फर्जी है।"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
