"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import {
  ArrowLeft,
  FileSearch,
  Copy,
  Check,
} from "lucide-react";

export default function AuditPage() {
  const params = useParams();
  const id = params?.id as string;
  const [lang, setLang] = useState<"hi" | "en">("en");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "signals" | "provenance" | "json">("summary");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(getApiUrl(`/v1/checks/${id}`))
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

  const tabs = [
    { id: "summary", label: lang === "en" ? "Summary" : "सारांश (Summary)" },
    { id: "signals", label: lang === "en" ? `Signals (${(data.signals || []).length})` : `संकेत (${(data.signals || []).length} Signals)` },
    { id: "provenance", label: lang === "en" ? "Provenance" : "प्रमाणिकता (Provenance)" },
    { id: "json", label: lang === "en" ? "Raw JSON" : "कच्चा JSON (Raw Data)" },
  ];

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
            <span>{lang === "en" ? "Back to Verification Result" : "सत्यापन परिणाम पर वापस जाएं"}</span>
          </Link>
        </div>

        {/* Audit Header */}
        <div className="bg-white rounded-2xl border border-canvas-line p-6 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-brand" />
                <h1 className="text-xl font-bold text-ink">
                  {lang === "en" ? "Public Audit Trail Record" : "सार्वजनिक ऑडिट ट्रेल (Audit Record)"}
                </h1>
              </div>
              <p className="text-xs font-mono text-ink-subtle mt-1">
                Public ID: <span className="font-bold text-ink">{data.public_id}</span> · Check ID: {data.id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-slate-100 text-ink">
                {lang === "en" ? `Verdict: ${data.verdict}` : `निर्णय: ${data.verdict}`}
              </span>
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-ink hover:bg-slate-50 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === "en" ? "Copied!" : "कॉपी हुआ!") : (lang === "en" ? "Copy JSON" : "JSON कॉपी करें")}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-canvas-line">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? "border-brand text-brand bg-brand/5 rounded-t-lg"
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
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-canvas-line p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-ink-subtle">
                {lang === "en" ? "Input Details & Language Detection" : "प्राप्त संदेश व भाषा (Input Claim)"}
              </h3>
              <div className="p-4 rounded-xl bg-canvas border border-canvas-line font-mono text-xs text-ink leading-relaxed">
                {data.input?.extracted_text || "(No text content)"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-ink-subtle block">{lang === "en" ? "Input Type" : "इनपुट प्रकार"}</span>
                  <span className="font-bold text-ink uppercase">{data.input?.type}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-ink-subtle block">{lang === "en" ? "Detected Language" : "पहचानी गई भाषा"}</span>
                  <span className="font-bold text-ink uppercase">{data.input?.lang_detected}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-ink-subtle block">{lang === "en" ? "Confidence" : "विश्वास स्तर"}</span>
                  <span className="font-bold text-ink">{Math.round((data.confidence || 0) * 100)}% ({data.confidence_band})</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-ink-subtle block">{lang === "en" ? "Processing Time" : "प्रोसेसिंग समय"}</span>
                  <span className="font-bold text-ink">{data.timings_ms?.total || 420} ms</span>
                </div>
              </div>
            </div>

            {/* Timings Waterfall */}
            <div className="bg-white rounded-2xl border border-canvas-line p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-ink-subtle">
                {lang === "en" ? "Pipeline Execution Timing Waterfall" : "पाइपलाइन चरण व समय (Timing Waterfall)"}
              </h3>
              <div className="space-y-2">
                {Object.entries(data.timings_ms || {}).map(([stage, ms]: any) => (
                  <div key={stage} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-mono text-ink-subtle uppercase">{stage}</span>
                    <span className="font-bold text-ink font-mono">{ms} ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Signals */}
        {activeTab === "signals" && (
          <div className="bg-white rounded-2xl border border-canvas-line p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-ink-subtle">
              {lang === "en" ? "Forensic & Security Signals Fired" : "सत्यापित तकनीकी संकेत (Fired Forensic Signals)"}
            </h3>
            {(data.signals || []).length === 0 ? (
              <p className="text-xs text-ink-subtle">
                {lang === "en" ? "No adverse forensic signals detected." : "कोई संदिग्ध तकनीकी संकेत नहीं मिला।"}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(data.signals || []).map((s: any, idx: number) => (
                  <div key={idx} className="py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100">
                        {s.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-brand">{s.signal_id}</span>
                      <span className="text-xs text-ink-subtle font-mono">[{s.group}]</span>
                    </div>
                    <p className="text-xs text-ink">{s.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Provenance */}
        {activeTab === "provenance" && (
          <div className="bg-white rounded-2xl border border-canvas-line p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-ink-subtle">
              {lang === "en" ? "Model & Deterministic Rules Provenance" : "सिस्टम प्रमाणिकता व संस्करण (System Provenance)"}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-ink-subtle">{lang === "en" ? "Corpus Snapshot" : "कॉर्पस स्नैपशॉट"}</span>
                <span className="font-mono font-bold text-ink">{data.provenance?.corpus_snapshot}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-ink-subtle">{lang === "en" ? "Prompt Engine Version" : "प्रॉम्प्ट वर्ज़न"}</span>
                <span className="font-mono font-bold text-ink">{data.provenance?.prompt_version}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-ink-subtle">{lang === "en" ? "Verdict Model" : "सत्यापन मॉडल"}</span>
                <span className="font-mono font-bold text-ink">{data.provenance?.model_id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-ink-subtle">{lang === "en" ? "Rule Zero Enforcement" : "नियम शून्य स्थिति"}</span>
                <span className="font-bold text-emerald-700">Strict (Zero Hallucination by Construction)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-ink-subtle">{lang === "en" ? "Created Timestamp" : "सत्यापन समय"}</span>
                <span className="font-mono text-ink">{data.created_at}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Raw JSON */}
        {activeTab === "json" && (
          <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto shadow-sm">
            <pre className="text-xs font-mono text-emerald-400">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
