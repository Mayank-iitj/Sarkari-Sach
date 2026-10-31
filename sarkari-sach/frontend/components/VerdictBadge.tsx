"use client";

import { ShieldCheck, ShieldAlert, History, FileDiff, HelpCircle } from "lucide-react";

interface VerdictBadgeProps {
  verdict: string;
  confidence?: number;
  confidenceBand?: string;
}

const META: Record<string, {
  labelHi: string;
  labelEn: string;
  bg: string;
  fg: string;
  border: string;
  icon: any;
}> = {
  CONFIRMED: {
    labelHi: "पुष्ट / सही",
    labelEn: "CONFIRMED",
    bg: "bg-[#E6F4EA]",
    fg: "text-[#0B7A3E]",
    border: "border-[#A3D9B5]",
    icon: ShieldCheck,
  },
  OUTDATED: {
    labelHi: "पुराना / बदल चुका",
    labelEn: "OUTDATED",
    bg: "bg-[#FFF3D6]",
    fg: "text-[#8A5A00]",
    border: "border-[#FAD88A]",
    icon: History,
  },
  ALTERED: {
    labelHi: "बदला हुआ / हेरफेर",
    labelEn: "ALTERED",
    bg: "bg-[#FFEBD5]",
    fg: "text-[#B45309]",
    border: "border-[#FBC396]",
    icon: FileDiff,
  },
  UNVERIFIABLE: {
    labelHi: "पुष्टि नहीं हो सकी",
    labelEn: "UNVERIFIABLE",
    bg: "bg-[#EEF2F6]",
    fg: "text-[#475569]",
    border: "border-[#CBD5E1]",
    icon: HelpCircle,
  },
  FORGED: {
    labelHi: "नकली / जालसाजी",
    labelEn: "FORGED",
    bg: "bg-[#FDE7E5]",
    fg: "text-[#B3261E]",
    border: "border-[#F8A59F]",
    icon: ShieldAlert,
  },
};

export default function VerdictBadge({ verdict, confidence, confidenceBand }: VerdictBadgeProps) {
  const meta = META[verdict] || META.UNVERIFIABLE;
  const Icon = meta.icon;

  return (
    <div
      className={`w-full rounded-2xl p-5 sm:p-6 border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${meta.bg} ${meta.border}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-white/80 shadow-sm shrink-0 ${meta.fg}`}>
          <Icon className="w-8 h-8" strokeWidth={2.5} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${meta.fg}`}>
              {meta.labelEn}
            </span>
            <span className="text-xl sm:text-2xl font-bold opacity-80">
              · {meta.labelHi}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-ink-subtle mt-0.5">
            Verified strictly against Government of India official records
          </p>
        </div>
      </div>

      {confidence !== undefined && verdict !== "UNVERIFIABLE" && (
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10">
          <span className="text-xs text-ink-subtle font-semibold uppercase tracking-wider">Confidence</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-lg font-extrabold ${meta.fg}`}>
              {Math.round(confidence * 100)}%
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 border border-black/5">
              {confidenceBand || "High"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

