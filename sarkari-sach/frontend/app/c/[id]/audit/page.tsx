"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  FileSearch,
  Copy,
  Check,
} from "lucide-react";

export default function AuditPage() {
  const params = useParams();
  const id = params?.id as string;
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "signals" | "provenance" | "json">("summary");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:8000/v1/checks/${id}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <Navbar lang={lang} setLang={setLang} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/c/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-subtle hover:text-brand"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>सत्यापन परिणाम पर वापस जाएं</span>
          </Link>
        </div>

        {/* Audit Header */}
        <div className="bg-white rounded-2xl border border-canvas-line p-6 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-brand" />
                <h1 className="text-xl font-bold text-ink">सार्वजनिक ऑडिट ट्रेल (Audit Record)</h1>
              </div>
              <p className="text-xs font-mono text-ink-subtle mt-1">
                Public ID: <span className="font-bold text-ink">{data.public_id}</span> · Check ID: {data.id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-slate-100 text-ink">
                निर्णय: {data.verdict}
              </span>
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-ink hover:bg-slate-50 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "कॉपी हुआ!" : "JSON कॉपी करें"}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-canvas-line">
            {[
              { id: "summary", label: "सारांश (Summary)" },
              { id: "signals", label: `संकेत (${(data.signals || []).length} Signals)` },
              { id: "provenance", label: "प्रमाणिकता (Provenance)" },
              { id: "json", label: "कच्चा JSON (Raw Data)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-subtle hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Summary */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-3">
              <h3 className="text-sm font-bold text-ink">दावे का इनपुट (Input Record):</h3>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-ink leading-relaxed whitespace-pre-wrap">
                {data.input?.extracted_text || "No text available"}
              </div>
              <div className="flex gap-4 text-xs text-ink-subtle">
                <span>प्रकार: <strong>{data.input?.type}</strong></span>
                <span>भाषा: <strong>{data.input?.lang_detected}</strong></span>
                <span>आत्मविश्वास: <strong>{Math.round((data.confidence || 0) * 100)}% ({data.confidence_band})</strong></span>
              </div>
            </div>

            {/* Reasons */}
            <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-2">
              <h3 className="text-sm font-bold text-ink">निर्णय के नियम (Decision Engine):</h3>
              <ul className="space-y-1.5">
                {(data.reasons || []).map((r: any, idx: number) => (
                  <li key={idx} className="text-xs text-ink bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                    {r.code}: {JSON.stringify(r.detail || r.message || {})}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Signals */}
        {activeTab === "signals" && (
          <div className="bg-white rounded-2xl border border-canvas-line p-5">
            <h3 className="text-sm font-bold text-ink mb-4">फोरेंसिक्स साक्ष्य (Security & Forensics):</h3>
            <div className="divide-y divide-canvas-line">
              {(data.signals || []).map((s: any, idx: number) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-ink">
                      {s.group}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {s.severity}
                    </span>
                    <code className="text-xs font-bold text-brand">{s.signal_id}</code>
                  </div>
                  <p className="text-xs text-ink">{s.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Provenance */}
        {activeTab === "provenance" && (
          <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink">प्रणाली की प्रमाणिकता (Provenance & Reproducibility):</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-ink-subtle block mb-1">Corpus Snapshot:</span>
                <span className="font-bold font-mono text-ink">{data.provenance?.corpus_snapshot || "latest"}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-ink-subtle block mb-1">Prompt Version:</span>
                <span className="font-bold font-mono text-ink">{data.provenance?.prompt_version || "p1.0"}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-ink-subtle block mb-1">Model Identifier:</span>
                <span className="font-bold font-mono text-ink">{data.provenance?.model_id || "claude-sonnet-5-5"}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-ink-subtle block mb-1">Total Processing Time:</span>
                <span className="font-bold font-mono text-ink">{data.timings_ms?.total || 0} ms</span>
              </div>
            </div>

            {/* Timings breakdown */}
            <div className="pt-3 border-t border-canvas-line">
              <h4 className="text-xs font-bold text-ink mb-2">स्टेज निष्पादन समय (Timings Breakdown):</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                {Object.entries(data.timings_ms || {}).map(([stage, ms], idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-100 text-center">
                    <span className="text-ink-subtle block text-[10px] uppercase">{stage}</span>
                    <span className="font-bold text-ink">{String(ms)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Raw JSON */}
        {activeTab === "json" && (
          <div className="bg-white rounded-2xl border border-canvas-line p-5">
            <pre className="text-xs font-mono bg-slate-950 text-slate-100 p-4 rounded-xl overflow-x-auto max-h-[600px] leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

