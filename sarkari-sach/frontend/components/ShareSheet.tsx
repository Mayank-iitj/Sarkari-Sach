"use client";

import { Download, MessageCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface ShareSheetProps {
  checkId: string;
  publicId: string;
  verdict: string;
  shortText: string;
}

export default function ShareSheet({ checkId, publicId, verdict, shortText }: ShareSheetProps) {
  const cardUrl = getApiUrl(`/v1/checks/${checkId}/card.png`);
  const auditUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${publicId}`;

  const shareText = `*Sarkari Sach Verification Verdict:* [${verdict}]\n\n${shortText}\n\nOfficial Primary Evidence & Full Audit: ${auditUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="bg-slate-50 rounded-2xl border border-canvas-line p-5 my-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="text-sm font-bold text-ink">Send verified answer back to your WhatsApp group</h4>
        <p className="text-xs text-ink-subtle mt-0.5">
          Download the verified card image or share directly on WhatsApp to stop misinformation.
        </p>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <a
          href={cardUrl}
          download={`sarkari-sach-${publicId}.png`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-ink border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 text-brand" />
          <span>Download Card</span>
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Share on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
