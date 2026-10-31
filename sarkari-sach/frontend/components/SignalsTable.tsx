"use client";

import { ShieldAlert } from "lucide-react";

interface Signal {
  signal_id: string;
  group: string;
  severity: "hard" | "soft" | "info";
  score: number;
  explanation: string;
  evidence?: any;
}

interface SignalsTableProps {
  signals: Signal[];
}

export default function SignalsTable({ signals }: SignalsTableProps) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-canvas-line shadow-sm overflow-hidden my-6">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-canvas-line flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-brand" />
          <span>Forensic Evidence & Technical Signals</span>
        </div>
        <span className="text-xs font-semibold text-ink-subtle">
          {signals.length} {signals.length === 1 ? "signal" : "signals"} detected
        </span>
      </div>

      <div className="divide-y divide-canvas-line">
        {signals.map((sig, idx) => {
          const isHard = sig.severity === "hard";
          const isSoft = sig.severity === "soft";

          return (
            <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                      isHard
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : isSoft
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {sig.severity}
                  </span>
                  <span className="text-xs font-bold text-ink-subtle">
                    {sig.group}
                  </span>
                  <code className="text-xs font-mono font-semibold text-ink px-1.5 py-0.5 bg-slate-100 rounded">
                    {sig.signal_id}
                  </code>
                </div>

                <span className="text-xs font-semibold text-ink-subtle">
                  Score: {Math.round(sig.score * 100)}%
                </span>
              </div>

              <p className="text-sm text-ink leading-relaxed pl-1">
                {sig.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
