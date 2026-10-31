"use client";

import { AlertTriangle, BookOpen } from "lucide-react";

interface DiffItem {
  field: string;
  claim: string;
  official: string;
  quote: string;
  document_id?: string;
  clause_ref?: string;
}

interface DiffPanelProps {
  diffs: DiffItem[];
}

export default function DiffPanel({ diffs }: DiffPanelProps) {
  if (!diffs || diffs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-canvas-line shadow-sm overflow-hidden my-6">
      <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>हेराफेरी विश्लेषण / Field Differences</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
          {diffs.length} {diffs.length === 1 ? "mismatch" : "mismatches"} found
        </span>
      </div>

      <div className="p-5 divide-y divide-canvas-line">
        {diffs.map((diff, idx) => (
          <div key={idx} className="pt-4 first:pt-0 pb-4 last:pb-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded bg-slate-100 text-ink-subtle">
                फ़ील्ड: {diff.field}
              </span>
              {diff.clause_ref && (
                <span className="text-xs font-medium text-brand flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {diff.clause_ref}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Claim */}
              <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200">
                <span className="text-xs font-semibold text-red-700 block mb-1">
                  संदेश में दावा (Forwarded Message):
                </span>
                <span className="text-base font-extrabold text-red-950">
                  {diff.claim}
                </span>
              </div>

              {/* Official */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800 block mb-1">
                  आधिकारिक दस्तावेज़ में नियम (Official Source):
                </span>
                <span className="text-base font-extrabold text-emerald-950">
                  {diff.official}
                </span>
              </div>
            </div>

            {/* Verbatim quote */}
            {diff.quote && (
              <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-ink leading-relaxed">
                <span className="font-semibold text-ink-subtle block mb-0.5">
                  सरकारी गजट / अधिसूचना उद्धरण (Verbatim Quote):
                </span>
                "{diff.quote}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

