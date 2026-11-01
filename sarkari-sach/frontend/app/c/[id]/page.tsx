"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import VerdictBadge from "@/components/VerdictBadge";
import DiffPanel from "@/components/DiffPanel";
import LineageTimeline from "@/components/LineageTimeline";
import SignalsTable from "@/components/SignalsTable";
import EvidenceViewer from "@/components/EvidenceViewer";
import AudioPlayer from "@/components/AudioPlayer";
import ShareSheet from "@/components/ShareSheet";
import { getApiUrl } from "@/lib/api";
import {
  ArrowLeft,
  ExternalLink,
  FileSearch,
  AlertOctagon,
} from "lucide-react";

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [lang, setLang] = useState<"hi" | "en">("en");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    let pollTimeout: any = null;

    const fetchResult = async () => {
      try {
        const res = await fetch(getApiUrl(`/v1/checks/${id}`));
        if (!res.ok) throw new Error("Failed to load result");
        const json = await res.json();
        if (!isMounted) return;

        setData(json);

        // If pipeline is still processing in background, poll until completion
        if (json.status !== "DONE" && json.status !== "ERROR") {
          pollTimeout = setTimeout(fetchResult, 1500);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load check result");
        setLoading(false);
      }
    };

    fetchResult();

    return () => {
      isMounted = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <Navbar lang={lang} setLang={setLang} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-ink-subtle">
            {lang === "en" ? "Loading verification result..." : "सत्यापन परिणाम लोड हो रहा है..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <Navbar lang={lang} setLang={setLang} />
        <div className="flex-1 max-w-xl mx-auto w-full px-4 py-16 text-center space-y-4">
          <AlertOctagon className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-bold text-ink">
            {lang === "en" ? "Result Not Found" : "परिणाम नहीं मिला"}
          </h2>
          <p className="text-sm text-ink-subtle">
            {error || (lang === "en" ? "This check does not exist or has expired." : "यह जाँच उपलब्ध नहीं है या समाप्त हो चुकी है।")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "en" ? "Back to Home" : "होम पर वापस जाएं"}</span>
          </Link>
        </div>
      </div>
    );
  }

  const verdict = data.verdict || "UNVERIFIABLE";
  const explanation = data.explanation || {};
  const diffs = data.diffs || [];
  const signals = data.signals || [];
  const evidence = data.evidence || [];
  const lineage = data.lineage || {};
  const warnings = data.warnings || [];
  const steps = explanation.steps || [];

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 sm:py-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-subtle hover:text-brand transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "en" ? "Verify New Claim" : "नई जाँच करें"}</span>
          </Link>

          <Link
            href={`/c/${id}/audit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-canvas-line text-xs font-bold text-brand hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Full Audit Trail →" : "पूर्ण ऑडिट ट्रेल (Audit Page) →"}</span>
          </Link>
        </div>

        {/* 1. Verdict Badge */}
        <VerdictBadge
          verdict={verdict}
          confidence={data.confidence}
          confidenceBand={data.confidence_band}
        />

        {/* 2. Plain Language Summary */}
        <div className="bg-white rounded-2xl border border-canvas-line p-5 sm:p-6 my-6 shadow-sm space-y-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-ink leading-snug">
            {explanation.short || (lang === "en" ? "Verification complete." : "जाँच परिणाम तैयार है।")}
          </h2>

          {/* Voice note player using the exact same authentic voice as WhatsApp */}
          <AudioPlayer
            audioUrl={explanation.audio_url || (data.id ? `/v1/checks/${data.id}/audio` : `/v1/checks/${id}/audio`)}
            ttsText={explanation.tts_text || explanation.short}
            lang={explanation.lang || lang}
          />

          {/* Recommended Actions */}
          {steps.length > 0 && (
            <div className="pt-3 border-t border-canvas-line space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle block">
                {lang === "en" ? "Recommended Actions:" : "क्या करें (Recommended Actions):"}
              </span>
              <ul className="space-y-1.5">
                {steps.map((st: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-ink leading-relaxed">
                    <span className="text-emerald-600 font-extrabold">✓</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 font-medium">
              ⚠ <strong>{lang === "en" ? "Caution:" : "सतर्कता:"}</strong> {warnings[0]}
            </div>
          )}
        </div>

        {/* 3. Share Verified Card & WhatsApp Forward */}
        <ShareSheet
          checkId={data.id}
          publicId={data.public_id}
          verdict={verdict}
          shortText={explanation.short || (lang === "en" ? "Sarkari Sach Verification Result" : "सरकारी सच सत्यापन परिणाम")}
          claimText={diffs[0]?.claim || data.input_content || "Government Scheme Claim"}
          officialText={diffs[0]?.official || explanation.short || "Verified Official Record"}
          citation={evidence[0]?.document?.title || evidence[0]?.document?.doc_number || "Official Gazette / PIB Record"}
          warning={warnings[0] || ""}
          lang={lang}
        />

        {/* 4. Diff Panel (for ALTERED notices) */}
        {diffs.length > 0 && <DiffPanel diffs={diffs} />}

        {/* 5. Lineage Timeline (for OUTDATED notices or schemes) */}
        {lineage.timeline && lineage.timeline.length > 0 && (
          <LineageTimeline
            timeline={lineage.timeline}
            superseded={lineage.superseded}
            expired={lineage.expired}
          />
        )}

        {/* 6. Primary Sources Evidence Accordion */}
        {evidence.length > 0 && <EvidenceViewer evidence={evidence} />}

        {/* 7. Forensic & Security Signals Table */}
        {signals.length > 0 && <SignalsTable signals={signals} />}

        {/* 8. Searched Sources if Abstaining */}
        {verdict === "UNVERIFIABLE" && (
          <div className="bg-white rounded-2xl border border-canvas-line p-5 my-6 space-y-3">
            <h3 className="text-sm font-bold text-ink">
              {lang === "en" ? "Searched Official Repositories:" : "हमने ये आधिकारिक स्रोत खोजे:"}
            </h3>
            <ul className="text-xs text-ink-subtle space-y-1">
              <li>• Press Information Bureau (pib.gov.in)</li>
              <li>• The Gazette of India (egazette.gov.in)</li>
              <li>• National Scheme Portal (myscheme.gov.in)</li>
            </ul>
            <p className="text-xs text-ink-subtle bg-slate-50 p-3 rounded-lg border border-slate-200">
              {lang === "en"
                ? "No official notification or primary source matched this claim. In accordance with Rule Zero, the system abstains from validating unverified forwards. Do not forward this claim without an authentic notification."
                : "आधिकारिक रिकॉर्ड्स में इस दावे का कोई पुष्ट प्रमाण नहीं मिला। जब तक आधिकारिक अधिसूचना न दिखे, इसे आगे फॉरवर्ड न करें।"}
            </p>
          </div>
        )}

        {/* Bottom Audit Link */}
        <div className="text-center pt-6 pb-12">
          <Link
            href={`/c/${id}/audit`}
            className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
          >
            <span>{lang === "en" ? "View full technical & forensic audit log (Audit Page)" : "इस परिणाम का पूर्ण तकनीकी व फोरेंसिक्स ऑडिट देखें (Audit Page)"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
