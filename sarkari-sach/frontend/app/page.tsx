"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  ShieldCheck,
  Send,
  Image as ImageIcon,
  Link2,
  Mic,
  MicOff,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

const SAMPLES = [
  {
    labelHi: "नकली योजना (Scene 1: FORGED)",
    labelEn: "Fake Scheme Poster",
    type: "text",
    text: "पीएम किसान योजना: सभी किसानों को ₹12,000 सालाना मिलेंगे। ₹250 शुल्क देकर तुरंत pmkisan-yojana.in पर आवेदन करें।",
  },
  {
    labelHi: "बदली सूचना (Scene 2: ALTERED)",
    labelEn: "Altered Notice",
    type: "text",
    text: "पीएम किसान सम्मान निधि: सरकार ने जारी की नई किस्त। सभी पात्र किसानों को मिलेंगे ₹12,000 सालाना। आधिकारिक वेबसाइट pmkisan.gov.in पर देखें।",
  },
  {
    labelHi: "पुराना नियम (Scene 3: OUTDATED)",
    labelEn: "Superseded Order",
    type: "text",
    text: "PM-KISAN दिशा-निर्देश F.No. 1-1/2019-Credit-I के अनुसार ₹6,000 की राशि प्राप्त करने हेतु क्या यह नियम अभी भी लागू है?",
  },
  {
    labelHi: "अपुष्ट अफ़वाह (Scene 4: ABSTAIN)",
    labelEn: "Unverified Rumor",
    type: "text",
    text: "कल से पूरे देश में सभी नागरिकों के लिए नया नियम लागू हो रहा है, जल्दी देखें!",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [inputText, setInputText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  // SSE streaming states
  const [stages, setStages] = useState<{ [key: string]: { status: string; note: string } }>({
    NORMALIZED: { status: "pending", note: "Reading message / OCR..." },
    RETRIEVED: { status: "pending", note: "Searching PIB, Gazette, myScheme..." },
    FORENSICS: { status: "pending", note: "Link, PDF & document analysis..." },
    COMPARED: { status: "pending", note: "Verbatim clause-by-clause comparison..." },
  });
  const [liveSignals, setLiveSignals] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSampleClick = (sample: typeof SAMPLES[0]) => {
    setInputText(sample.text);
    setUrlInput("");
    setSelectedFile(null);
  };

  const handleVoiceToggle = () => {
    if (!isRecording) {
      if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
        try {
          const SpeechRecognition = (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText((prev) => (prev ? prev + " " + transcript : transcript));
            setIsRecording(false);
          };
          recognition.onerror = () => setIsRecording(false);
          recognition.start();
          setIsRecording(true);
          return;
        } catch (e) {
          // fallback
        }
      }
      // Demo simulated voice note
      setIsRecording(true);
      setTimeout(() => {
        setInputText("क्या पीएम किसान योजना की सम्मान निधि राशि ₹12,000 कर दी गई है और क्या ₹250 शुल्क लगेगा?");
        setIsRecording(false);
      }, 1500);
    } else {
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText && !urlInput && !selectedFile) return;

    setIsSubmitting(true);
    setLiveSignals([]);
    setStages({
      NORMALIZED: { status: "running", note: "Reading text & detecting language..." },
      RETRIEVED: { status: "pending", note: "Searching PIB, Gazette, myScheme..." },
      FORENSICS: { status: "pending", note: "Link, PDF & document analysis..." },
      COMPARED: { status: "pending", note: "Verbatim clause-by-clause comparison..." },
    });

    try {
      const formData = new FormData();
      if (inputText) formData.append("text", inputText);
      if (urlInput) formData.append("url", urlInput);
      formData.append("reply_lang", lang);
      if (selectedFile) formData.append("file", selectedFile);

      const res = await fetch("http://localhost:8000/v1/checks", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Check creation failed");
      }

      const data = await res.json();
      setActiveCheckId(data.id);

      // Listen to SSE progress
      const eventSource = new EventSource(`http://localhost:8000/v1/checks/${data.id}/events`);

      eventSource.addEventListener("stage", (evt: any) => {
        try {
          const payload = JSON.parse(evt.data);
          setStages((prev) => ({
            ...prev,
            [payload.stage]: { status: payload.status, note: payload.note || "" },
          }));
        } catch (err) {}
      });

      eventSource.addEventListener("signal", (evt: any) => {
        try {
          const payload = JSON.parse(evt.data);
          setLiveSignals((prev) => [...prev, `${payload.signal_id} (${payload.severity})`]);
        } catch (err) {}
      });

      eventSource.addEventListener("done", (evt: any) => {
        eventSource.close();
        router.push(`/c/${data.id}`);
      });

      eventSource.onerror = () => {
        eventSource.close();
        // Fallback: poll result
        setTimeout(() => {
          router.push(`/c/${data.id}`);
        }, 1200);
      };
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>सत्यापित प्राथमिक स्रोत (PIB · e-Gazette · myScheme)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight">
            {lang === "hi" ? "फॉरवर्ड आया? सच जाँचें।" : "Got a Forward? Verify the Truth."}
          </h1>
          <p className="text-sm sm:text-base text-ink-subtle max-w-xl mx-auto leading-relaxed">
            {lang === "hi"
              ? "व्हाट्सएप सर्कुलर, सरकारी योजना पोस्टर, बदली तारीख या संदिग्ध लिंक पेस्ट करें। हूबहू आधिकारिक धारा उद्धरण के साथ निष्पक्ष फैसला पाएं।"
              : "Verify government claims, viral notices, scheme posters, and links against official Central Government gazettes with verbatim clause citations."}
          </p>
        </div>

        {/* Input Composer Card */}
        <div className="bg-white rounded-3xl border border-canvas-line shadow-sm p-4 sm:p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={4}
                placeholder={
                  lang === "hi"
                    ? "यहाँ व्हाट्सएप संदेश या संदिग्ध सर्कुलर का टेक्स्ट पेस्ट करें..."
                    : "Paste forwarded message, scheme details, or circular text here..."
                }
                className="w-full p-4 rounded-2xl bg-canvas border border-canvas-line text-ink text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none leading-relaxed"
                disabled={isSubmitting}
              />
            </div>

            {/* Quick URL Bar */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-canvas border border-canvas-line text-xs sm:text-sm">
              <Link2 className="w-4 h-4 text-ink-subtle shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="वेबसाइट या लिंक (e.g. pmkisan-yojana.in)"
                className="bg-transparent w-full focus:outline-none text-ink placeholder:text-ink-muted text-xs sm:text-sm"
                disabled={isSubmitting}
              />
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav"
            />

            {/* Selected File Chip */}
            {selectedFile && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <span className="truncate max-w-xs font-medium">📎 {selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-blue-700 hover:text-blue-900 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-canvas-line">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-ink-subtle hover:text-ink hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  disabled={isSubmitting}
                >
                  <ImageIcon className="w-4 h-4 text-brand" />
                  <span className="hidden sm:inline">फोटो / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isRecording
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : "text-ink-subtle hover:text-ink hover:bg-slate-100"
                  }`}
                  disabled={isSubmitting}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-brand" />}
                  <span>{isRecording ? "सुन रहे हैं..." : "बोलकर"}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (!inputText && !urlInput && !selectedFile)}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>जाँच हो रही है...</span>
                  </>
                ) : (
                  <>
                    <span>सच जाँचें</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live SSE Progress Stepper */}
        {isSubmitting && (
          <div className="bg-white rounded-3xl border border-canvas-line shadow-sm p-6 mb-8 space-y-4 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-accent animate-spin" />
              <span>सत्यापन प्रक्रिया (Real-time Pipeline)</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(stages).map(([stageName, stageData], idx) => {
                const isDone = stageData.status === "done";
                const isRunning = stageData.status === "running";

                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isRunning ? (
                        <Loader2 className="w-4 h-4 text-brand animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div>
                      <span className={`text-xs font-bold ${isDone ? "text-ink" : "text-ink-subtle"}`}>
                        {stageName}:
                      </span>{" "}
                      <span className="text-xs text-ink-subtle">{stageData.note}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {liveSignals.length > 0 && (
              <div className="pt-3 border-t border-canvas-line">
                <span className="text-xs font-bold text-amber-900 block mb-1">
                  खोजी गई तकनीकी चेतावनियाँ (Forensic Signals):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {liveSignals.map((sig, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      ⚠ {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sample Demo Chips */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-subtle uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
            <span>{lang === "hi" ? "या आज़माएँ (डेमो परिदृश्य):" : "Or try live demo scenes:"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SAMPLES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSampleClick(sample)}
                className="text-left p-3.5 rounded-2xl bg-white border border-canvas-line hover:border-brand/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand group-hover:text-brand-accent transition-colors">
                    {lang === "hi" ? sample.labelHi : sample.labelEn}
                  </span>
                  <span className="text-[10px] text-ink-muted">लोड करें ↗</span>
                </div>
                <p className="text-xs text-ink-subtle truncate mt-1">
                  "{sample.text}"
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Rule Zero Note */}
        <div className="mt-12 text-center text-xs text-ink-muted leading-relaxed max-w-md mx-auto">
          <strong>नियम शून्य:</strong> बिना सरकारी उद्धरण कोई निर्णय नहीं। जब संदेह हो, पुष्टि अस्वीकार (No citation, no verdict. When unsure, abstain.)
        </div>
      </main>
    </div>
  );
}

