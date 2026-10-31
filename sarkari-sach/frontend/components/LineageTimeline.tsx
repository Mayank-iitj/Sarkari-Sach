"use client";

import { History } from "lucide-react";

interface TimelineItem {
  date?: string;
  document_id?: string;
  title?: string;
  change?: string;
  relation?: string;
}

interface LineageTimelineProps {
  timeline: TimelineItem[];
  superseded: boolean;
  expired: boolean;
}

export default function LineageTimeline({ timeline, superseded, expired }: LineageTimelineProps) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-canvas-line shadow-sm p-5 my-6">
      <div className="flex items-center justify-between pb-4 border-b border-canvas-line mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-ink">नियम का इतिहास (Lineage Timeline)</h3>
        </div>
        {superseded && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
            नियम अधिक्रमित (Superseded)
          </span>
        )}
      </div>

      <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {timeline.map((item, idx) => {
          const isLatest = idx === timeline.length - 1;
          return (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-white ${
                  isLatest
                    ? "border-emerald-600 ring-4 ring-emerald-50"
                    : "border-amber-500 ring-4 ring-amber-50"
                }`}
              />

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-subtle">
                    {item.date || "Notification Date"}
                  </span>
                  {item.relation && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {item.relation}
                    </span>
                  )}
                  {isLatest && superseded && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      वर्तमान में प्रभावी (Currently Active)
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-ink">
                  {item.title || "Government Notification"}
                </h4>

                {item.change && (
                  <p className="text-xs text-ink-subtle bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {item.change}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

