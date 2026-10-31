"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import { ALL_MYSCHEME_ITEMS } from "@/lib/schemes_data";
import { ArrowLeft, Clock, FileText, CheckCircle2, AlertTriangle, Layers, ExternalLink, ShieldCheck } from "lucide-react";

interface TimelineItem {
  date: string;
  document_id: string;
  title: string;
  change: string;
  relation: string | null;
}

interface SchemeDetails {
  id: string;
  name: string;
  issuer: string;
  provisions: Array<{ field: string; value: string; quote: string; effective_from: string | null }>;
  documents: Array<{ id: string; title: string; doc_number: string; published_on: string | null; url: string }>;
}

export default function SchemeLineagePage() {
  const params = useParams();
  const schemeId = (params?.id as string) || "pm-kisan";

  const [lang, setLang] = useState<"hi" | "en">("en");
  const [details, setDetails] = useState<SchemeDetails | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [detRes, linRes] = await Promise.all([
          fetch(getApiUrl(`/v1/schemes/${schemeId}`)),
          fetch(getApiUrl(`/v1/schemes/${schemeId}/lineage`)),
        ]);

        if (detRes.ok) {
          const d = await detRes.json();
          setDetails(d);
        }
        if (linRes.ok) {
          const l = await linRes.json();
          setTimeline(l.timeline || []);
        }
      } catch (err) {
        console.error("Error loading lineage:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [schemeId]);

  const fallbackItem = ALL_MYSCHEME_ITEMS.find(
    (x) => x.id === schemeId || x.id.toLowerCase() === schemeId.toLowerCase()
  );

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/schemes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-subtle hover:text-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "en" ? "Back to Schemes Directory" : "योजना सूची पर वापस"}</span>
          </Link>

          <Link
            href={`/?q=${encodeURIComponent(details?.name || fallbackItem?.nameEn || schemeId)}`}
            className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition-colors shadow-sm"
          >
            {lang === "en" ? "Verify Message for this Scheme" : "इस योजना की जाँच करें"}
          </Link>
        </div>

        {/* Scheme Header */}
        <div className="bg-white rounded-3xl border border-canvas-line p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                {details?.issuer || fallbackItem?.issuer || "Government of India"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {details?.name || (lang === "hi" ? fallbackItem?.nameHi : fallbackItem?.nameEn) || schemeId.toUpperCase()}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Authorized Version</span>
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-ink-subtle">
            {lang === "en"
              ? "Official Gazette lineage & myScheme registry trace. Track how policy orders, eligibility definitions, and statutory entitlements evolved over time."
              : "आधिकारिक राजपत्र संशोधन व myScheme इतिहास। जानिए इस योजना के नियम और पात्रता समय के साथ कैसे बदले।"}
          </p>

          {/* Key Provisions Quick Summary */}
          {fallbackItem && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-canvas-line text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-ink-subtle tracking-wider block">Authorized Benefit</span>
                <span className="text-ink font-semibold">{fallbackItem.benefit}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-ink-subtle tracking-wider block">Eligibility</span>
                <span className="text-ink font-semibold">{fallbackItem.eligibility}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-ink-subtle tracking-wider block">Official Portal</span>
                <a
                  href={fallbackItem.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>{fallbackItem.portal}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Chronological Gazette Lineage Stepper */}
        <div className="bg-white rounded-3xl border border-canvas-line p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-canvas-line">
            <div className="flex items-center gap-2 text-ink">
              <Clock className="w-5 h-5 text-brand" />
              <h2 className="text-lg font-bold">
                {lang === "en" ? "Gazette Notification Timeline & Amendment History" : "राजपत्र अधिसूचना समयरेखा"}
              </h2>
            </div>
            <span className="text-xs text-ink-subtle">
              {timeline.length} {lang === "en" ? "Milestones" : "संशोधन"}
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8">
            {timeline.length === 0 ? (
              <p className="text-xs text-ink-subtle">No historical amendments found for this entry.</p>
            ) : (
              timeline.map((item, idx) => {
                const isLatest = idx === timeline.length - 1;
                return (
                  <div key={idx} className="relative group">
                    {/* Stepper Dot */}
                    <div
                      className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-white ring-2 ${
                        isLatest ? "bg-emerald-600 ring-emerald-300" : "bg-slate-400 ring-slate-200"
                      }`}
                    />

                    <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-2 hover:border-brand/40 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                          {item.date}
                        </span>
                        {item.relation && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                            {item.relation}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-ink">{item.title}</h4>
                      <p className="text-xs text-ink-subtle leading-relaxed">{item.change}</p>

                      <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Doc ID: {item.document_id}</span>
                        <Link
                          href={`/documents?q=${encodeURIComponent(item.title)}`}
                          className="text-brand hover:underline inline-flex items-center gap-1"
                        >
                          <span>Inspect Original Text</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Current Active Provisions Table */}
        {details?.provisions && details.provisions.length > 0 && (
          <div className="bg-white rounded-3xl border border-canvas-line p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>{lang === "en" ? "Currently Verified Policy Provisions" : "वर्तमान अधिकृत नियम"}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-canvas-line text-ink-subtle font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Authorized Value</th>
                    <th className="py-2.5 px-3">Official Primary Quote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.provisions.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-ink capitalize">{p.field}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">{p.value}</td>
                      <td className="py-3 px-3 text-ink-subtle italic max-w-xs">{p.quote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

