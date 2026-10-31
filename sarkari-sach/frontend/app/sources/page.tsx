"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import { Globe, ShieldCheck, AlertTriangle, CheckCircle2, Search, ExternalLink, RefreshCw, Lock, Server } from "lucide-react";

interface DomainCheckResult {
  input: string;
  registrable_domain: string;
  host: string;
  is_official: boolean;
  trust_tier: number;
  signals: Array<{ signal_id: string; severity: string; score: number; explanation: string }>;
  verdict: "OFFICIAL_GOVERNMENT_DOMAIN" | "MALICIOUS_LOOKALIKE" | "UNAUTHORIZED_THIRD_PARTY";
}

interface SourceItem {
  id: string;
  name: string;
  documents: number;
  last_fetched: string | null;
  domains: string[];
}

export default function OfficialSourcesPage() {
  const [lang, setLang] = useState<"hi" | "en">("en");
  const [testDomain, setTestDomain] = useState("");
  const [domainResult, setDomainResult] = useState<DomainCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [snapshot, setSnapshot] = useState("2026-10-31a");

  // Load registry sources from backend
  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch(getApiUrl("/v1/sources"));
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || []);
          if (data.snapshot) setSnapshot(data.snapshot);
        }
      } catch (err) {
        console.error("Failed to load sources:", err);
      }
    }
    loadSources();
  }, []);

  // Handle Domain Authenticity Check
  const handleCheckDomain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testDomain.trim() || testDomain.trim().length < 3) return;

    setChecking(true);
    try {
      const res = await fetch(getApiUrl(`/v1/sources/check-domain?url_or_domain=${encodeURIComponent(testDomain.trim())}`));
      if (res.ok) {
        const data = await res.json();
        setDomainResult(data);
      }
    } catch (err) {
      console.error("Domain check error:", err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-10">
        {/* Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Official Domain Registry & Primary Sources" : "आधिकारिक डोमेन व स्रोत रजिस्ट्री"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            {lang === "en" ? "Government Whitelist & Anti-Impersonation Registry" : "भारत सरकार आधिकारिक स्रोत व डोमेन सत्यापन"}
          </h1>

          <p className="text-xs sm:text-sm text-ink-subtle">
            {lang === "en"
              ? "Sarkari Sach operates under strict Rule Zero: we only ingest and cite official Indian Government domains (.gov.in, .nic.in, rbi.org.in). Test any suspicious URL below to verify whether it is truly authorized."
              : "सरकारी सच केवल अधिकृत सरकारी पोर्टल्स (.gov.in, .nic.in) से तथ्य उद्धृत करता है। किसी भी लिंक या वेबसाइट की प्रामाणिकता यहाँ जांचें।"}
          </p>
        </div>

        {/* Interactive Domain Whitelist Authenticator Tool */}
        <div className="bg-white rounded-3xl border border-canvas-line p-6 sm:p-8 space-y-5 shadow-sm max-w-3xl mx-auto">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand" />
              <span>{lang === "en" ? "Live Government Domain Authenticator" : "लाइव सरकारी डोमेन प्रमाणक"}</span>
            </h2>
            <p className="text-xs text-ink-subtle">
              {lang === "en"
                ? "Enter any domain or link received in WhatsApp (e.g. pmkisan-yojana.com, pmkisan.gov.in, fastag-update.top):"
                : "व्हाट्सएप या मैसेज में आया कोई भी लिंक या डोमेन दर्ज करें:"}
            </p>
          </div>

          <form onSubmit={handleCheckDomain} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-subtle absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                placeholder="e.g. pmkisan-yojana.com or https://pmkisan.gov.in"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border border-canvas-line text-sm font-mono text-ink placeholder:font-sans placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={checking}
              className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition-all disabled:opacity-60 shadow-sm flex-shrink-0"
            >
              {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{lang === "en" ? "Authenticate" : "प्रमाणित करें"}</span>
            </button>
          </form>

          {/* Quick Click Samples */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-ink-subtle font-medium">{lang === "en" ? "Try Samples:" : "उदाहरण:"}</span>
            <button
              type="button"
              onClick={() => {
                setTestDomain("pmkisan.gov.in");
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-mono font-bold hover:bg-emerald-100 border border-emerald-200"
            >
              pmkisan.gov.in (Official)
            </button>
            <button
              type="button"
              onClick={() => {
                setTestDomain("pmkisan-yojana.xyz");
              }}
              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 text-[11px] font-mono font-bold hover:bg-red-100 border border-red-200"
            >
              pmkisan-yojana.xyz (Spoof)
            </button>
            <button
              type="button"
              onClick={() => {
                setTestDomain("sarkari-scheme.in.net");
              }}
              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 text-[11px] font-mono font-bold hover:bg-red-100 border border-red-200"
            >
              sarkari-scheme.in.net (Commercial TLD)
            </button>
          </div>

          {/* Result Card */}
          {domainResult && (
            <div
              className={`p-5 rounded-2xl border transition-all ${
                domainResult.is_official
                  ? "bg-emerald-50/80 border-emerald-300"
                  : "bg-red-50/80 border-red-300"
              } space-y-3 mt-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {domainResult.is_official ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider block text-slate-600">
                      Domain: {domainResult.host || domainResult.registrable_domain}
                    </span>
                    <h3
                      className={`text-base font-extrabold ${
                        domainResult.is_official ? "text-emerald-900" : "text-red-900"
                      }`}
                    >
                      {domainResult.verdict === "OFFICIAL_GOVERNMENT_DOMAIN" && "AUTHENTIC GOVERNMENT DOMAIN (अधिकृत सरकारी डोमेन)"}
                      {domainResult.verdict === "MALICIOUS_LOOKALIKE" && "MALICIOUS IMPOSTOR / BRAND SQUATTING (फर्जी वेबसाइट)"}
                      {domainResult.verdict === "UNAUTHORIZED_THIRD_PARTY" && "UNAUTHORIZED THIRD PARTY (गैर-सरकारी डोमेन)"}
                    </h3>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    domainResult.is_official
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-red-200 text-red-900"
                  }`}
                >
                  {domainResult.is_official ? "Trust Tier 1 (Official)" : "Blocked by Rule Zero"}
                </span>
              </div>

              {/* Signals Breakdown */}
              {domainResult.signals.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                    Forensic Security Findings:
                  </span>
                  <ul className="space-y-1 text-xs">
                    {domainResult.signals.map((sig, sidx) => (
                      <li key={sidx} className="flex items-start gap-1.5 text-slate-800">
                        <span className="text-red-600 font-bold">•</span>
                        <span>{sig.explanation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4-Tier Trust Hierarchy Architecture */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-ink">
              {lang === "en" ? "Government Source Trust Hierarchy" : "आधिकारिक स्रोत स्तरीय पदानुक्रम"}
            </h2>
            <p className="text-xs text-ink-subtle">
              {lang === "en"
                ? "Every claim is resolved strictly in order of legal precedence."
                : "प्रत्येक दावे का निर्णय कानूनी प्राथमिकता के आधार पर लिया जाता है।"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tier 1 */}
            <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/10 text-brand">TIER 1 (Supreme)</span>
                <Server className="w-4 h-4 text-brand" />
              </div>
              <h3 className="font-bold text-sm text-ink">The Gazette of India</h3>
              <p className="text-xs font-mono text-brand">egazette.gov.in</p>
              <p className="text-xs text-ink-subtle leading-relaxed">
                Extraordinary Gazette notifications (G.S.R. / S.O. orders). Carries absolute statutory legal weight over any ministerial speech or rumor.
              </p>
            </div>

            {/* Tier 2 */}
            <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">TIER 2 (Cabinet)</span>
                <Globe className="w-4 h-4 text-blue-700" />
              </div>
              <h3 className="font-bold text-sm text-ink">PIB Fact Check</h3>
              <p className="text-xs font-mono text-blue-700">pib.gov.in</p>
              <p className="text-xs text-ink-subtle leading-relaxed">
                Direct press releases from the Union Cabinet, NITI Aayog, and official fact-checks disproving forged circulars.
              </p>
            </div>

            {/* Tier 3 */}
            <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">TIER 3 (Schemes)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="font-bold text-sm text-ink">myScheme National Portal</h3>
              <p className="text-xs font-mono text-emerald-700">myscheme.gov.in</p>
              <p className="text-xs text-ink-subtle leading-relaxed">
                Unified government registry for citizen eligibility, authorized installment dates, application procedures, and zero fees.
              </p>
            </div>

            {/* Tier 4 */}
            <div className="bg-white rounded-2xl border border-canvas-line p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">TIER 4 (Statutory)</span>
                <Lock className="w-4 h-4 text-purple-700" />
              </div>
              <h3 className="font-bold text-sm text-ink">Regulatory Authorities</h3>
              <p className="text-xs font-mono text-purple-700">rbi.org.in / sebi.gov.in</p>
              <p className="text-xs text-ink-subtle leading-relaxed">
                Reserve Bank of India banking circulars, SEBI investor warnings, and EPFO retirement benefits.
              </p>
            </div>
          </div>
        </div>

        {/* Live Corpus Snapshot & Repositories Table */}
        <div className="bg-white rounded-3xl border border-canvas-line p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-canvas-line">
            <div>
              <h3 className="font-extrabold text-base text-ink">Active Verified Primary Repositories</h3>
              <p className="text-xs text-ink-subtle">Corpus Snapshot ID: {snapshot} · Updated Daily</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              100% Cryptographic Content Hashes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-canvas-line text-ink-subtle font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Source Name</th>
                  <th className="py-2.5 px-3">Base Official Domains</th>
                  <th className="py-2.5 px-3">Indexed Documents</th>
                  <th className="py-2.5 px-3">Last Crawled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {sources.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold font-sans text-ink">{s.name}</td>
                    <td className="py-3 px-3 text-brand">{s.domains.join(", ") || ".gov.in"}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{s.documents} documents</td>
                    <td className="py-3 px-3 text-ink-subtle">{s.last_fetched ? s.last_fetched.split("T")[0] : "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
