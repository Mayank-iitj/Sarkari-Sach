"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import { BookOpen, Search, ExternalLink, Filter, Calendar, FileText, ChevronDown, ChevronUp, Hash, ShieldCheck } from "lucide-react";

interface DocumentItem {
  id: string;
  source_id: string;
  doc_type: string;
  title: string;
  issuer: string | null;
  doc_number: string | null;
  published_on: string | null;
  effective_from: string | null;
  effective_to: string | null;
  url: string;
  text: string;
  snapshot_id: string;
}

export default function DocumentsCorpusPage() {
  const [lang, setLang] = useState<"hi" | "en">("en");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("");
  const [docType, setDocType] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        let url = getApiUrl("/v1/documents?limit=40");
        if (query) url += `&q=${encodeURIComponent(query)}`;
        if (docType && docType !== "all") url += `&doc_type=${encodeURIComponent(docType)}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDocs(data);
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    }
    const t = setTimeout(fetchDocuments, 200);
    return () => clearTimeout(t);
  }, [query, docType]);

  const docTypes = [
    { id: "all", label: "All Documents" },
    { id: "notification", label: "Gazette Notifications" },
    { id: "press_release", label: "Press Releases (PIB)" },
    { id: "circular", label: "Ministry Circulars" },
    { id: "scheme", label: "Scheme Portals" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Official Gazette & Primary Corpus" : "राजपत्र व आधिकारिक संग्रह"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            {lang === "en" ? "Verified Government Documents Corpus" : "सत्यापित सरकारी राजपत्र एवं अधिसूचना संग्रह"}
          </h1>

          <p className="text-xs sm:text-sm text-ink-subtle">
            {lang === "en"
              ? "Browse all immutable primary source documents indexed in the Sarkari Sach repository. Every verification verdict links to verbatim clauses from these official notifications."
              : "सरकारी सच में संग्रहीत सभी आधिकारिक राजपत्र व सरकारी परिपत्र। प्रत्येक निर्णय इन्हीं मूल दस्तावेजों से प्रमाणित होता है।"}
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white rounded-3xl border border-canvas-line p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-subtle absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === "en"
                  ? "Search by file number, title, or keywords (e.g. S.O. 456, G.S.R., PM-KISAN)..."
                  : "दस्तावेज़ संख्या या शीर्षक खोजें..."
              }
              className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border border-canvas-line text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all shadow-sm"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-ink-subtle mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Type:</span>
            </span>
            {docTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setDocType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  docType === t.id
                    ? "bg-brand text-white shadow-sm"
                    : "bg-slate-100 text-ink-subtle hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-subtle font-medium">
            <span>
              Showing {docs.length} verified documents
            </span>
            <span>Snapshot: Latest Verified</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-subtle text-xs">Loading official corpus...</div>
          ) : docs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-canvas-line text-ink-subtle text-xs">
              No matching official documents found. Try adjusting your search query.
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => {
                const isExpanded = expandedId === d.id;
                return (
                  <div
                    key={d.id}
                    className="bg-white rounded-2xl border border-canvas-line p-5 shadow-sm space-y-3 hover:border-brand/40 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand">
                            {d.doc_type}
                          </span>
                          {d.doc_number && (
                            <span className="text-xs font-mono font-bold text-ink bg-slate-100 px-2 py-0.5 rounded">
                              {d.doc_number}
                            </span>
                          )}
                          {d.published_on && (
                            <span className="text-[11px] text-ink-subtle flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{d.published_on}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-sm sm:text-base text-ink leading-snug">
                          {d.title}
                        </h3>
                        <p className="text-xs text-ink-subtle">{d.issuer || "Government of India"}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-ink text-xs font-bold hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : d.id)}
                          className="px-3 py-1.5 rounded-xl border border-canvas-line text-xs font-bold text-brand hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{isExpanded ? "Hide Text" : "View Clauses"}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Excerpt */}
                    {!isExpanded && (
                      <p className="text-xs text-ink-subtle line-clamp-2 leading-relaxed">
                        {d.text}
                      </p>
                    )}

                    {/* Full Clause View */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-canvas-line space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Doc ID: {d.id}</span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Primary Verified Text</span>
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {d.text}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
