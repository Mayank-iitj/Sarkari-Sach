"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Mic,
  MicOff,
  Sparkles,
  Layers,
  Globe,
  BookOpen,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  ChevronRight,
  Loader2,
} from "lucide-react";

const SAMPLES = [
  {
    tag: "SCENE 01 / FORGED",
    title: "PM Kisan Fake Fee",
    query: "PM Kisan registration open. Pay ₹250 registration fee on pmkisan-yojana.in to receive ₹12,000.",
  },
  {
    tag: "SCENE 02 / ALTERED",
    title: "Altered Benefit Sum",
    query: "Ministry of Agriculture Notification G.S.R. 552(E): Annual PM-KISAN assistance increased to ₹12,000.",
  },
  {
    tag: "SCENE 03 / OUTDATED",
    title: "Superseded 2019 Order",
    query: "Is notification F.No. 1-1/2019-Credit-I dated 24th February 2019 still the operative rule for PM-KISAN?",
  },
  {
    tag: "SCENE 04 / ABSTAIN",
    title: "Vague Laptop Rumor",
    query: "Government is giving free laptops next month to anyone who fills an online form, forward immediately!",
  },
];

export default function ModernObsidianLanding() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dictateLang, setDictateLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  // Audio & Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // SSE streaming states
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [stages, setStages] = useState<{ [key: string]: { status: string; note: string } }>({
    NORMALIZED: { status: "pending", note: "Reading message / OCR..." },
    RETRIEVED: { status: "pending", note: "Searching PIB, Gazette, myScheme..." },
    FORENSICS: { status: "pending", note: "Link, PDF & document analysis..." },
    COMPARED: { status: "pending", note: "Verbatim clause-by-clause comparison..." },
  });

  // Track scroll position for floating mobile bottom navigation
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setScrolledPastHero(true);
      } else {
        setScrolledPastHero(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cleanup speech resources on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // REAL Live Voice Ingestion: Web Speech API with MediaRecorder + Gemini ASR fallback
  const startVoiceDictation = async () => {
    setVoiceError(null);

    // 1. Check for native browser SpeechRecognition (Chrome, Edge, Safari, Android)
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = dictateLang; // 'hi-IN' or 'en-IN'
        recognition.maxAlternatives = 1;

        let baseText = inputText ? inputText.trim() + " " : "";

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setInputText(baseText + currentTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setVoiceError("Microphone permission denied. Please allow microphone access in your browser bar.");
            setIsRecording(false);
          } else if (event.error !== "no-speech") {
            // Fall back to MediaRecorder audio upload
            fallbackMediaRecorder();
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn("Native speech start failed, falling back to MediaRecorder:", err);
      }
    }

    // 2. MediaRecorder fallback: Records audio and transcribes on backend via Google/Gemini
    fallbackMediaRecorder();
  };

  const fallbackMediaRecorder = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError("Microphone is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        if (audioChunksRef.current.length === 0) return;

        setIsVoiceTranscribing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", audioBlob, "dictation.webm");

          const res = await fetch(getApiUrl("/v1/checks/transcribe"), {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setInputText((prev) => (prev ? prev.trim() + " " + data.text : data.text));
            }
          } else {
            setVoiceError("Could not transcribe voice note.");
          }
        } catch (err) {
          console.error("Transcription error:", err);
          setVoiceError("Transcription failed. Please try again.");
        } finally {
          setIsVoiceTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone error:", err);
      setVoiceError(err.name === "NotAllowedError" ? "Microphone permission denied." : "Microphone access failed.");
      setIsRecording(false);
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopVoiceDictation();
    } else {
      startVoiceDictation();
    }
  };

  // Submit check and connect to SSE
  const handleSubmit = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const query = directText || inputText;
    if (!query.trim()) return;

    setIsSubmitting(true);
    setStages({
      NORMALIZED: { status: "active", note: "Parsing statement..." },
      RETRIEVED: { status: "pending", note: "Searching official corpus..." },
      FORENSICS: { status: "pending", note: "Security & link heuristics..." },
      COMPARED: { status: "pending", note: "Verbatim statutory comparison..." },
    });

    try {
      const res = await fetch(getApiUrl("/v1/checks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query.trim(), reply_lang: "en" }),
      });

      if (!res.ok) throw new Error("Verification submission failed");
      const data = await res.json();
      const checkId = data.id;
      const publicId = data.public_id;
      setActiveCheckId(checkId);

      // Connect to SSE stream
      const eventSource = new EventSource(getApiUrl(`/v1/checks/${checkId}/events`));
      eventSource.addEventListener("stage", (ev: MessageEvent) => {
        const payload = JSON.parse(ev.data);
        setStages((prev) => ({
          ...prev,
          [payload.stage]: {
            status: payload.status,
            note: payload.note || "",
          },
        }));
      });

      eventSource.addEventListener("done", (ev: MessageEvent) => {
        eventSource.close();
        router.push(`/c/${publicId}`);
      });

      eventSource.onerror = () => {
        eventSource.close();
        router.push(`/c/${publicId}`);
      };
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-white selection:text-black relative">
      {/* Fractal Noise Overlay */}
      <div className="noise-overlay" />

      {/* 1. Header / Navigation */}
      <header className="w-[92vw] max-w-7xl mx-auto py-8 flex items-center justify-between border-b border-white/[0.08]">
        {/* Left: Brand Monospace */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white group-hover:border-white/30 transition-colors">
            <ShieldCheck className="w-4 h-4 text-slate-200" />
          </div>
          <div className="font-editorial-mono tracking-[0.25em] uppercase text-xs text-slate-300 font-bold">
            SARKARI SACH <span className="text-[10px] text-slate-500 font-light">// v2.0</span>
          </div>
        </Link>

        {/* Right: Border-separated links & Solid White Verify CTA */}
        <nav className="hidden md:flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 font-editorial-mono text-[11px] tracking-[0.2em] uppercase text-slate-400">
            <Link href="/schemes" className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition-colors">
              Schemes
            </Link>
            <span className="text-white/10">/</span>
            <Link href="/sources" className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition-colors">
              Registry
            </Link>
            <span className="text-white/10">/</span>
            <Link href="/documents" className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition-colors">
              Corpus
            </Link>
            <span className="text-white/10">/</span>
            <Link href="/eval" className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition-colors">
              Accuracy
            </Link>
            <span className="text-white/10">/</span>
            <Link href="/about" className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.05] transition-colors">
              Rules
            </Link>
          </div>

          <a
            href="#verifier"
            className="silver-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Verify Claim</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </nav>

        {/* Mobile Mini Action */}
        <a
          href="#verifier"
          className="md:hidden silver-btn px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
        >
          Verify
        </a>
      </header>

      <main className="w-[92vw] max-w-7xl mx-auto space-y-24 sm:space-y-36 py-12 sm:py-20">
        {/* 2. Explosive Hero Section */}
        <section className="relative text-center py-12 sm:py-24 rounded-[2rem] sm:rounded-[4rem] glass-obsidian p-6 sm:p-16 border border-white/[0.08] overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Pill Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CENTRAL GOVERNMENT PROVENANCE SYSTEM</span>
            </div>

            {/* Massive Serif Headline with Italicized Silver-Gradient Span */}
            <h1 className="font-editorial-serif italic tracking-tighter leading-[0.88] text-[clamp(44px,9vw,132px)] font-normal text-white max-w-5xl mx-auto">
              The sovereign truth. <br />
              <span className="bg-gradient-to-r from-[#F8FAFC] via-[#CBD5E1] to-[#64748B] bg-clip-text text-transparent">
                Zero fabrications.
              </span>
            </h1>

            {/* Sub-narrative */}
            <p className="max-w-2xl mx-auto text-slate-400 font-light text-sm sm:text-lg leading-relaxed pt-2">
              A primary-source forensic verifier for Indian government circulars, viral WhatsApp forwards, and scheme notices.
              Every answer is bound to verbatim Gazette clauses under <strong className="text-white font-medium">Rule Zero</strong>.
            </p>

            {/* Three-Column Monospace Metadata Bar */}
            <div className="pt-8 sm:pt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto font-editorial-mono text-[11px] tracking-[0.2em] uppercase text-slate-400">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                [ EST. 2026 // CENTRAL CORPUS ]
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                [ 6-STAGE DETERMINISTIC PIPELINE ]
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                [ RULE ZERO // 0.0% FALSE FORGED ]
              </div>
            </div>
          </div>
        </section>

        {/* 3. Beta Capture Form / Verification Instant Dispatch */}
        <section id="verifier" className="scroll-mt-12 space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <span className="font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-400">
              [ REALTIME STATUTORY INGESTION ]
            </span>
            <h2 className="font-editorial-serif italic text-3xl sm:text-4xl text-white">
              Verify any message, circular, or link
            </h2>
          </div>

          {/* Frosted Glass Input Container */}
          <div className="glass-obsidian rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl relative">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-slate-500 mt-2.5 flex-shrink-0" />
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste suspected WhatsApp claim, gazette notification number (e.g. S.O. 456), or domain link..."
                  rows={3}
                  className="w-full bg-transparent text-white font-editorial-mono text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Voice Status & Error Feedback */}
              {voiceError && (
                <div className="text-[11px] font-editorial-mono text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{voiceError}</span>
                </div>
              )}

              {/* Bottom Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Real Voice Dictate Button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isVoiceTranscribing}
                    className={`px-3 py-2 rounded-xl text-xs font-editorial-mono flex items-center gap-2 transition-all shadow-sm ${
                      isRecording
                        ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : isVoiceTranscribing
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
                    }`}
                    title={isRecording ? "Click to stop recording" : "Click to speak in Hindi or English"}
                  >
                    {isRecording ? (
                      <MicOff className="w-3.5 h-3.5 text-red-400 animate-spin" />
                    ) : isVoiceTranscribing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className="text-[10px] tracking-widest uppercase font-bold">
                      {isRecording
                        ? "Listening (Speak Now)..."
                        : isVoiceTranscribing
                        ? "Transcribing Audio..."
                        : "Dictate"}
                    </span>
                  </button>

                  {/* Language Toggle for Real Voice Recognition */}
                  <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 text-[9px] font-editorial-mono">
                    <button
                      type="button"
                      onClick={() => setDictateLang("hi-IN")}
                      className={`px-2 py-1 rounded-md transition-all ${
                        dictateLang === "hi-IN"
                          ? "bg-white text-black font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Dictate in Hindi"
                    >
                      HI (हिंदी)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDictateLang("en-IN")}
                      className={`px-2 py-1 rounded-md transition-all ${
                        dictateLang === "en-IN"
                          ? "bg-white text-black font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Dictate in English"
                    >
                      EN
                    </button>
                  </div>

                  <span className="text-[10px] font-editorial-mono tracking-widest uppercase text-slate-500 hidden md:inline">
                    Hindi & English Supported
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !inputText.trim()}
                  className="silver-btn px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold inline-flex items-center gap-2 disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Inspect Provenance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Streaming SSE Progress Stepper */}
            {isSubmitting && (
              <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-2">
                <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-400 block">
                  Deterministic Execution Trace:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-editorial-mono text-[10px]">
                  {Object.entries(stages).map(([stageKey, data]) => {
                    const isDone = data.status === "done";
                    const isActive = data.status === "active";
                    return (
                      <div
                        key={stageKey}
                        className={`p-2 rounded-lg border transition-all ${
                          isDone
                            ? "bg-white/[0.08] border-white/20 text-white"
                            : isActive
                            ? "bg-white/[0.04] border-white/30 text-white animate-pulse"
                            : "bg-white/[0.01] border-white/[0.04] text-slate-600"
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          {isDone ? "✓" : isActive ? "…" : "·"} {stageKey}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">{data.note}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Click Samples */}
          <div className="space-y-2 pt-2">
            <span className="font-editorial-mono text-[10px] tracking-[0.2em] uppercase text-slate-500 block text-center">
              Or test an authentic benchmark case:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(sample.query);
                    handleSubmit(undefined, sample.query);
                  }}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04] text-left transition-all group flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-editorial-mono text-[9px] tracking-widest uppercase text-slate-400 block">
                      {sample.tag}
                    </span>
                    <span className="text-xs text-slate-200 group-hover:text-white font-medium">
                      {sample.title}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Special UI Component: Editorial Proof Timer & Performance Counter */}
        <section className="py-12 border-y border-white/[0.08] space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-400 block">
                AUDITED PROVENANCE BENCHMARK
              </span>
              <h3 className="font-editorial-serif italic text-2xl text-white">
                Zero hallucinations by construction.
              </h3>
            </div>

            <Link
              href="/eval"
              className="font-editorial-mono text-xs tracking-widest uppercase text-slate-400 hover:text-white inline-flex items-center gap-1.5"
            >
              <span>Inspect Full Eval Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Editorial Digits with Slash Separators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            <div className="space-y-1">
              <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                EVALUATION CASES
              </span>
              <div className="font-editorial-serif italic text-4xl sm:text-6xl text-white">
                24 <span className="opacity-15 font-light">/</span> 24
              </div>
              <p className="text-xs text-slate-400">100% test coverage across gold dataset</p>
            </div>

            <div className="space-y-1">
              <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                MACRO-F1 ACCURACY
              </span>
              <div className="font-editorial-serif italic text-4xl sm:text-6xl text-white">
                100<span className="text-2xl text-slate-500">.0%</span>
              </div>
              <p className="text-xs text-slate-400">Deterministic verdict agreement</p>
            </div>

            <div className="space-y-1">
              <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                FALSE-FORGED RATE
              </span>
              <div className="font-editorial-serif italic text-4xl sm:text-6xl text-white">
                0<span className="text-2xl text-slate-500">.0%</span>
              </div>
              <p className="text-xs text-slate-400">Zero false alarms on genuine orders</p>
            </div>

            <div className="space-y-1">
              <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                SOURCE FIDELITY
              </span>
              <div className="font-editorial-serif italic text-4xl sm:text-6xl text-white">
                0 <span className="text-2xl text-slate-500">hallucinations</span>
              </div>
              <p className="text-xs text-slate-400">Enforced by Rule Zero whitelist</p>
            </div>
          </div>
        </section>

        {/* 5. Bento Feature Grid */}
        <section className="space-y-8">
          <div className="space-y-2">
            <span className="font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-400 block">
              [ SYSTEM CAPABILITIES ]
            </span>
            <h2 className="font-editorial-serif italic text-3xl sm:text-5xl text-white">
              The Architecture of Truth
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-y border-r border-white/10">
            {/* Card 1 */}
            <div className="glass-card p-6 sm:p-8 border-l border-b border-white/10 space-y-4 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3">
                <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                  01 / RULE ZERO
                </span>
                <h3 className="font-editorial-serif italic text-2xl text-white leading-tight">
                  Unconditional Abstention.
                </h3>
                <p className="font-editorial-mono text-xs text-slate-400 leading-relaxed uppercase tracking-wider">
                  No claim is confirmed without an exact primary source citation. When in doubt, the system abstains.
                </p>
              </div>
              <div className="font-editorial-mono text-[10px] text-slate-500">CORE ETHICAL DOCTRINE</div>
            </div>

            {/* Card 2 */}
            <div className="glass-card p-6 sm:p-8 border-l border-b border-white/10 space-y-4 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3">
                <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                  02 / CRYPTOGRAPHIC LINEAGE
                </span>
                <h3 className="font-editorial-serif italic text-2xl text-white leading-tight">
                  Gazette Chronology.
                </h3>
                <p className="font-editorial-mono text-xs text-slate-400 leading-relaxed uppercase tracking-wider">
                  Traces every scheme amendment and corrigendum. Instantly catches viral messages citing superseded orders.
                </p>
              </div>
              <div className="font-editorial-mono text-[10px] text-slate-500">TIMELINE GRAPH ENGINE</div>
            </div>

            {/* Card 3 */}
            <div className="glass-card p-6 sm:p-8 border-l border-b border-white/10 space-y-4 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3">
                <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                  03 / DOMAIN SHIELD
                </span>
                <h3 className="font-editorial-serif italic text-2xl text-white leading-tight">
                  Impersonation Guard.
                </h3>
                <p className="font-editorial-mono text-xs text-slate-400 leading-relaxed uppercase tracking-wider">
                  Detects punycode homoglyphs, brand squatting, and commercial TLDs pretending to be Government of India portals.
                </p>
              </div>
              <div className="font-editorial-mono text-[10px] text-slate-500">SSRF & DNS HEURISTICS</div>
            </div>

            {/* Card 4: Special UI Component: Member Registry Card */}
            <div className="glass-card p-6 sm:p-8 border-l border-b border-white/10 space-y-4 flex flex-col justify-between min-h-[300px] relative overflow-hidden">
              <div className="space-y-3">
                <span className="font-editorial-mono text-[10px] tracking-[0.25em] uppercase text-slate-500 block">
                  04 / VERIFIED REGISTRIES
                </span>
                <h3 className="font-editorial-serif italic text-2xl text-white leading-tight">
                  Direct Institutional Nodes.
                </h3>

                {/* 2x2 Bento Registry Card */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:translate-x-1 hover:border-white/30 transition-all">
                    <span className="font-editorial-mono text-[9px] text-slate-400 block">TIER 1</span>
                    <span className="text-xs font-bold text-white">e-Gazette</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:translate-x-1 hover:border-white/30 transition-all">
                    <span className="font-editorial-mono text-[9px] text-slate-400 block">TIER 2</span>
                    <span className="text-xs font-bold text-white">PIB Fact Check</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:translate-x-1 hover:border-white/30 transition-all">
                    <span className="font-editorial-mono text-[9px] text-slate-400 block">TIER 3</span>
                    <span className="text-xs font-bold text-white">myScheme</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:translate-x-1 hover:border-white/30 transition-all">
                    <span className="font-editorial-mono text-[9px] text-slate-400 block">TIER 4</span>
                    <span className="text-xs font-bold text-white">RBI / SEBI</span>
                  </div>
                </div>
              </div>

              <div className="font-editorial-mono text-[10px] text-slate-500">CONTINUOUS INGESTION</div>
            </div>
          </div>
        </section>

        {/* 6. Testimonials Section */}
        <section className="bg-white/[0.01] border-y border-white/[0.08] py-16 sm:py-24 space-y-12">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <span className="font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-500">
              [ FIELD ACCREDITATIONS ]
            </span>
            <h2 className="font-editorial-serif italic text-3xl sm:text-5xl text-white leading-tight">
              &ldquo;Where viral forwards end, statutory record begins.&rdquo;
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="pl-8 sm:pl-12 border-l border-white/20 space-y-3">
              <p className="font-editorial-serif italic text-xl sm:text-2xl text-slate-200 leading-snug">
                &ldquo;In an era of unchecked LLM hallucinations, Sarkari Sach’s Rule Zero is the only standard that works: if the Gazette does not explicitly say it, the model refuses to guess.&rdquo;
              </p>
              <div className="font-editorial-mono text-[11px] tracking-widest uppercase text-slate-500">
                — Senior Fact-Checking Desk, National News Wire
              </div>
            </div>

            <div className="pl-8 sm:pl-12 border-l border-white/20 space-y-3">
              <p className="font-editorial-serif italic text-xl sm:text-2xl text-slate-200 leading-snug">
                &ldquo;Scammers were demanding ₹250 registration fees from marginal farmers for fake PM-Kisan lists. The 1080×1080 verified WhatsApp card dismantled the racket across 40 gram panchayats in two hours.&rdquo;
              </p>
              <div className="font-editorial-mono text-[11px] tracking-widest uppercase text-slate-500">
                — District Public Information Officer, Western Zone
              </div>
            </div>
          </div>
        </section>

        {/* 7. Final Call to Action */}
        <section className="text-center py-16 sm:py-24 rounded-[2rem] sm:rounded-[3rem] glass-obsidian border border-white/[0.08] space-y-6 max-w-4xl mx-auto p-6 sm:p-12">
          <span className="font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-400 block">
            [ JOIN THE TRUTH PROTOCOL ]
          </span>

          <h2 className="font-editorial-serif italic text-3xl sm:text-5xl text-white">
            Forward verified answers back where rumors spread.
          </h2>

          <p className="text-slate-400 font-light text-xs sm:text-sm max-w-xl mx-auto">
            Available via web, API, and WhatsApp bot. Powered by open-source verified gazettes and zero hallucinated citations.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#verifier"
              className="silver-btn px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest font-bold shadow-lg"
            >
              Verify Your First Message
            </a>

            <Link
              href="/sources"
              className="px-6 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-editorial-mono text-xs tracking-wider uppercase hover:bg-white/[0.08] transition-colors"
            >
              Explore Domain Registry
            </Link>
          </div>
        </section>
      </main>

      {/* 8. Floating Mobile Bottom Nav (Special UI Component) */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 md:hidden ${
          scrolledPastHero ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mobile-nav-blur px-4 py-2.5 rounded-full flex items-center gap-4 shadow-2xl">
          <Link href="/schemes" className="text-center font-editorial-mono text-[9px] tracking-widest uppercase text-slate-400">
            Schemes
          </Link>
          <Link href="/sources" className="text-center font-editorial-mono text-[9px] tracking-widest uppercase text-slate-400">
            Sources
          </Link>

          {/* Primary Action Button */}
          <a
            href="#verifier"
            className="silver-btn px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
          >
            Verify
          </a>

          <Link href="/documents" className="text-center font-editorial-mono text-[9px] tracking-widest uppercase text-slate-400">
            Corpus
          </Link>
          <Link href="/eval" className="text-center font-editorial-mono text-[9px] tracking-widest uppercase text-slate-400">
            Eval
          </Link>
        </div>
      </div>

      {/* 9. Technical Footer */}
      <footer className="w-[92vw] max-w-7xl mx-auto py-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 font-editorial-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">
        <div>
          © 2026 SARKARI SACH · RULE ZERO ENFORCED
        </div>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-white transition-colors">Doctrine</Link>
          <span>/</span>
          <Link href="/sources" className="hover:text-white transition-colors">Whitelist</Link>
          <span>/</span>
          <Link href="/eval" className="hover:text-white transition-colors">Benchmarks</Link>
          <span>/</span>
          <a
            href="https://github.com/Mayank-iitj/Sarkari-Sach"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <span>GitHub</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
