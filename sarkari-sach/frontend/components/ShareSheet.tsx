"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MessageCircle, Copy, Check, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface ShareSheetProps {
  checkId: string;
  publicId: string;
  verdict: string;
  shortText: string;
  claimText?: string;
  officialText?: string;
  citation?: string;
  warning?: string;
  lang?: string;
}

const VERDICT_THEMES: Record<string, { bg: string; border: string; text: string; labelEn: string; labelHi: string; icon: string }> = {
  CONFIRMED: { bg: "#DCFCE7", border: "#16A34A", text: "#15803D", labelEn: "CONFIRMED", labelHi: "पुष्ट (Genuine)", icon: "✓" },
  OUTDATED: { bg: "#FEF3C7", border: "#D97706", text: "#B45309", labelEn: "OUTDATED", labelHi: "पुराना (Superseded)", icon: "↺" },
  ALTERED: { bg: "#FFEDD5", border: "#EA580C", text: "#C2410C", labelEn: "ALTERED", labelHi: "बदला हुआ (Tampered)", icon: "≠" },
  UNVERIFIABLE: { bg: "#F1F5F9", border: "#64748B", text: "#475569", labelEn: "UNVERIFIABLE", labelHi: "अपुष्ट (Unconfirmed)", icon: "?" },
  FORGED: { bg: "#FEE2E2", border: "#DC2626", text: "#B91C1C", labelEn: "FORGED", labelHi: "नकली / जाली (Fake)", icon: "⚠" },
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export default function ShareSheet({
  checkId,
  publicId,
  verdict,
  shortText,
  claimText = "Government Scheme Message",
  officialText = "Official records verify the authorized provisions.",
  citation = "The Gazette of India / Official Government Portal",
  warning = "",
  lang = "en",
}: ShareSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const cardUrl = getApiUrl(`/v1/checks/${checkId}/card.png`);
  const auditUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${publicId}`;
  const shareText = `*Sarkari Sach Verification Verdict:* [${verdict}]\n\n${shortText}\n\nOfficial Primary Evidence & Full Audit: ${auditUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  // Render high-DPI Verified Share Card Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background Canvas
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, width, height);

    // Inner Card with Shadow
    const m = 40;
    const cardW = width - m * 2;
    const cardH = height - m * 2;
    const radius = 32;

    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.beginPath();
    ctx.roundRect(m, m, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // Card border
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Indian Tricolor Accent Stripe
    const stripeH = 9;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(m, m, cardW, radius, [radius, radius, 0, 0]);
    ctx.clip();

    ctx.fillStyle = "#FF9933"; // Saffron
    ctx.fillRect(m, m, cardW, stripeH);
    ctx.fillStyle = "#FFFFFF"; // White
    ctx.fillRect(m, m + stripeH, cardW, stripeH);
    ctx.fillStyle = "#138808"; // Green
    ctx.fillRect(m, m + stripeH * 2, cardW, stripeH);
    ctx.restore();

    // Institutional Header Bar (Navy)
    const headerTop = m + stripeH * 3;
    const headerH = 105;
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(m, headerTop, cardW, headerH);

    // Header Title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
    ctx.fillText("🏛️  SARKARI SACH · सरकारी सच", m + 44, headerTop + 45);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 20px system-ui, -apple-system, sans-serif";
    ctx.fillText("Official Government Fact Verification & Anti-Fraud Provenance", m + 44, headerTop + 80);

    // Large Verdict Badge
    const theme = VERDICT_THEMES[verdict] || VERDICT_THEMES.UNVERIFIABLE;
    const badgeTop = headerTop + headerH + 34;
    const badgeH = 115;
    const badgeW = cardW - 80;

    ctx.fillStyle = theme.bg;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(m + 40, badgeTop, badgeW, badgeH, 20);
    ctx.fill();
    ctx.stroke();

    // Verdict Badge Text
    ctx.fillStyle = theme.text;
    ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
    ctx.fillText(`[ ${theme.icon} ]  VERDICT: ${theme.labelEn} · ${theme.labelHi}`, m + 70, badgeTop + 62);

    ctx.font = "600 20px system-ui, -apple-system, sans-serif";
    ctx.fillText("Deterministic provenance check against authorized Gazette & PIB records", m + 70, badgeTop + 94);

    let curY = badgeTop + badgeH + 34;
    const boxW = cardW - 80;

    // BOX 1: Claim in Circulation (Red tinted)
    ctx.fillStyle = "#991B1B";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText("दावा (Claim in circulation):", m + 44, curY);
    curY += 16;

    const claimLines = wrapText(ctx, `"${claimText.slice(0, 160)}"`, boxW - 50);
    const claimBoxH = Math.max(90, claimLines.length * 28 + 36);

    ctx.fillStyle = "#FEF2F2";
    ctx.strokeStyle = "#FECACA";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(m + 40, curY, boxW, claimBoxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1E293B";
    ctx.font = "500 22px system-ui, -apple-system, sans-serif";
    claimLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, m + 64, curY + 36 + i * 30);
    });
    curY += claimBoxH + 26;

    // BOX 2: Official Truth (Emerald tinted)
    ctx.fillStyle = "#166534";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText("सरकारी तथ्य (Official Primary Truth):", m + 44, curY);
    curY += 16;

    const offLines = wrapText(ctx, `"${officialText.slice(0, 160)}"`, boxW - 50);
    const offBoxH = Math.max(90, offLines.length * 28 + 36);

    ctx.fillStyle = "#F0FDF4";
    ctx.strokeStyle = "#BBF7D0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(m + 40, curY, boxW, offBoxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0F172A";
    ctx.font = "600 22px system-ui, -apple-system, sans-serif";
    offLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, m + 64, curY + 36 + i * 30);
    });
    curY += offBoxH + 26;

    // BOX 3: Citation Pill
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
    ctx.fillText("प्रमाणित स्रोत (Official Citation & Registry):", m + 44, curY);
    curY += 14;

    const citeLines = wrapText(ctx, `Official Source: ${citation}`, boxW - 50);
    const citeH = 68;

    ctx.fillStyle = "#F8FAFC";
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(m + 40, curY, boxW, citeH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.font = "600 20px system-ui, -apple-system, sans-serif";
    ctx.fillText(citeLines[0] || citation, m + 64, curY + 42);
    curY += citeH + 20;

    // Warning Banner if present
    if (warning) {
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillText(`⚠️  सतर्कता: ${warning.slice(0, 85)}`, m + 44, curY);
    }

    // Bottom Footer Line
    const footerTop = height - m - 95;
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m + 40, footerTop);
    ctx.lineTo(width - m - 40, footerTop);
    ctx.stroke();

    // Footer Text
    const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    ctx.fillStyle = "#475569";
    ctx.font = "500 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(`जाँच तिथि: ${dateStr}  •  सार्वजनिक ऑडिट ट्रेल: sach.app/c/${publicId}`, m + 44, footerTop + 32);

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
    ctx.fillText("Rule Zero: Zero Hallucinated Citations · Verified against Primary Government Records", m + 44, footerTop + 62);
  }, [verdict, claimText, officialText, citation, warning, publicId]);

  // Client-side Instant HD PNG Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      window.open(cardUrl, "_blank");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `sarkari-sach-verified-${publicId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy Image directly to Clipboard for WhatsApp Web paste
  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }, "image/png");
    } catch {
      // Fallback: copy share text
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-canvas-line shadow-sm p-6 sm:p-7 my-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-canvas-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <h4 className="text-base font-extrabold text-ink">
              {lang === "en" ? "Verified Share Card (Canvas)" : "सत्यापित शेयर कार्ड (कैनवास)"}
            </h4>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand">
              <Sparkles className="w-3 h-3" />
              1080×1080 HD
            </span>
          </div>
          <p className="text-xs text-ink-subtle">
            {lang === "en"
              ? "Share this official verification card back to WhatsApp groups to counter misinformation."
              : "व्हाट्सएप ग्रुप्स में सही सरकारी जानकारी पहुँचाने के लिए यह कार्ड डाउनलोड या शेयर करें।"}
          </p>
        </div>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-canvas-line text-xs font-bold text-ink-subtle hover:text-brand hover:bg-slate-50 transition-colors"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showPreview ? (lang === "en" ? "Hide Card" : "कार्ड छुपाएं") : (lang === "en" ? "Show Card" : "कार्ड देखें")}</span>
        </button>
      </div>

      {/* Interactive HTML5 Canvas Preview */}
      {showPreview && (
        <div className="flex justify-center bg-slate-50/70 p-4 sm:p-6 rounded-2xl border border-dashed border-slate-200">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[420px] h-auto aspect-square rounded-2xl shadow-md border border-slate-200 bg-white"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* 1. Download Card */}
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark active:scale-[0.98] transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>{lang === "en" ? "Download Card (PNG)" : "कार्ड डाउनलोड करें (PNG)"}</span>
        </button>

        {/* 2. Copy Image to Clipboard */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-ink border border-slate-200 text-xs font-bold hover:bg-slate-200 active:scale-[0.98] transition-all shadow-sm"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-ink-subtle" />}
          <span>{copied ? (lang === "en" ? "Copied Image!" : "इमेज कॉपी हो गई!") : (lang === "en" ? "Copy Image" : "इमेज कॉपी करें")}</span>
        </button>

        {/* 3. Share on WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{lang === "en" ? "Share on WhatsApp" : "व्हाट्सएप पर शेयर करें"}</span>
        </a>
      </div>
    </div>
  );
}
