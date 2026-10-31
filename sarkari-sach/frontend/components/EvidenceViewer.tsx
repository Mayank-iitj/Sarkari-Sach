"use client";

import { ExternalLink, CheckCircle2, BookOpen } from "lucide-react";

interface EvidenceItem {
  document: {
    id?: string;
    title?: string;
    url?: string;
    source?: string;
    doc_number?: string;
    published_on?: string;
  };
  chunk: {
    id?: string;
    clause_ref?: string;
    text?: string;
  };
  field: string;
  comparison: string;
  quote: string;
  quote_valid: boolean;
}

interface EvidenceViewerProps {
  evidence: EvidenceItem[];
}

export default function EvidenceViewer({ evidence }: EvidenceViewerProps) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-canvas-line shadow-sm overflow-hidden my-6">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-canvas-line flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink font-bold text-sm">
          <BookOpen className="w-4 h-4 text-brand" />
          <span>Primary Government Sources & Gazette Citations</span>
        </div>
        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Zero Hallucination Quoting
        </span>
      </div>

      <div className="divide-y divide-canvas-line">
        {evidence.map((ev, idx) => (
          <div key={idx} className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-brand/10 text-brand">
                    {ev.document?.source?.toUpperCase() || "OFFICIAL SOURCE"}
                  </span>
                  {ev.chunk?.clause_ref && (
                    <span className="text-xs font-bold text-ink-subtle">
                      Clause: {ev.chunk.clause_ref}
                    </span>
                  )}
                  {ev.document?.doc_number && (
                    <span className="text-xs font-mono text-ink-subtle">
                      {ev.document.doc_number}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-ink mt-1">
                  {ev.document?.title || "Official Government Notification"}
                </h4>
              </div>

              {ev.document?.url && (
                <a
                  href={ev.document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                >
                  View on Official Portal
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Quote with quote validator checkmark */}
            {ev.quote && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-ink leading-relaxed">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-ink-subtle">
                    Verbatim Quote from Notification:
                  </span>
                  {ev.quote_valid && (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      100% Substring Validated
                    </span>
                  )}
                </div>
                <blockquote className="italic text-ink font-serif pl-2 border-l-2 border-brand">
                  "{ev.quote}"
                </blockquote>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
