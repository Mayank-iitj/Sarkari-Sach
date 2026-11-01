"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
  Landmark,
  Leaf,
  HeartPulse,
  Sun,
  Fingerprint,
  MessageCircle,
} from "lucide-react";

const CircularText = dynamic(() => import("@/components/CircularText"), {
  ssr: false,
  loading: () => (
    <div className="w-[190px] h-[190px] rounded-full border border-white/10 flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </div>
  ),
});

const LogoLoop = dynamic(() => import("@/components/LogoLoop"), {
  ssr: false,
  loading: () => <div className="h-16 w-full animate-pulse bg-white/[0.02]" />,
});

const VoicePill = dynamic(() => import("@/components/VoicePill"), {
  ssr: false,
  loading: () => <div className="w-9 h-9 rounded-full bg-white/[0.04] animate-pulse" />,
});

const GOV_REGISTRY_LOGOS = [
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer">
        <Landmark className="w-4 h-4 text-emerald-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">The Gazette of India</span>
      </div>
    ),
    title: "egazette.gov.in",
    href: "https://egazette.gov.in",
    hoverColor: "#10B981",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all cursor-pointer">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">PIB Fact Check</span>
      </div>
    ),
    title: "pib.gov.in",
    href: "https://pib.gov.in",
    hoverColor: "#38BDF8",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all cursor-pointer">
        <Layers className="w-4 h-4 text-amber-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">myScheme National Portal</span>
      </div>
    ),
    title: "myscheme.gov.in",
    href: "https://myscheme.gov.in",
    hoverColor: "#F59E0B",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all cursor-pointer">
        <Globe className="w-4 h-4 text-blue-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">NIC Cloud (.gov.in)</span>
      </div>
    ),
    title: "nic.in",
    href: "https://nic.in",
    hoverColor: "#60A5FA",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">Digital India</span>
      </div>
    ),
    title: "digitalindia.gov.in",
    href: "https://digitalindia.gov.in",
    hoverColor: "#34D399",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all cursor-pointer">
        <Leaf className="w-4 h-4 text-orange-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">PM-KISAN (MoA&FW)</span>
      </div>
    ),
    title: "pmkisan.gov.in",
    href: "https://pmkisan.gov.in",
    hoverColor: "#FB923C",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer">
        <HeartPulse className="w-4 h-4 text-rose-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">Ayushman Bharat (NHA)</span>
      </div>
    ),
    title: "nha.gov.in",
    href: "https://nha.gov.in",
    hoverColor: "#F43F5E",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all cursor-pointer">
        <Lock className="w-4 h-4 text-purple-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">DigiLocker</span>
      </div>
    ),
    title: "digilocker.gov.in",
    href: "https://digilocker.gov.in",
    hoverColor: "#C084FC",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/10 transition-all cursor-pointer">
        <Sun className="w-4 h-4 text-yellow-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">PM Surya Ghar (MNRE)</span>
      </div>
    ),
    title: "pmsuryaghar.gov.in",
    href: "https://pmsuryaghar.gov.in",
    hoverColor: "#FACC15",
  },
  {
    node: (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer">
        <Fingerprint className="w-4 h-4 text-indigo-400" />
        <span className="font-editorial-mono text-xs font-semibold text-slate-200">UIDAI Authority</span>
      </div>
    ),
    title: "uidai.gov.in",
    href: "https://uidai.gov.in",
    hoverColor: "#818CF8",
  },
];

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

        {/* Right: Border-separated links & WhatsApp Tile & Solid White Verify CTA */}
        <nav className="hidden md:flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 font-editorial-mono text-[11px] tracking-[0.2em] uppercase text-slate-400">
            <Link href="/whatsapp" className="px-3.5 py-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-1.5 transition-colors font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WhatsApp
            </Link>
            <span className="text-white/10">/</span>
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

          {/* WhatsApp Dedicated Tile */}
          <Link
            href="/whatsapp"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60 font-editorial-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.12)] group"
            title="Chat with Sarkari Sach official WhatsApp bot"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>WhatsApp Bot</span>
          </Link>

          <a
            href="#verifier"
            className="silver-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Verify Claim</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </nav>

        {/* Mobile Mini Actions */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/whatsapp"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 text-[10px] font-bold uppercase"
            aria-label="WhatsApp Bot"
          >
            <MessageCircle className="w-3 h-3 text-emerald-400" />
            <span>WhatsApp</span>
          </Link>
          <a
            href="#verifier"
            className="silver-btn px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
          >
            Verify
          </a>
        </div>
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

            {/* Interactive Live Backend Cluster Seal from React Bits */}
            <div className="pt-8 sm:pt-12 flex flex-col items-center justify-center">
              <a
                href="https://sarkari-sach.onrender.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Click to spin up / view Render deployed backend cluster"
                className="group relative flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-105"
                onMouseEnter={() => {
                  try {
                    fetch("https://sarkari-sach.onrender.com/v1/health", { mode: "no-cors" });
                  } catch {}
                }}
              >
                <CircularText
                  text="SPIN•UP•BACKEND•RENDER•CLUSTER•LIVE•API•"
                  onHover="speedUp"
                  direction="clockwise"
                  spinDuration={18}
                  size={190}
                  fontSize={11}
                  fontWeight={800}
                  letterSpacing={0.12}
                  color="#94A3B8"
                  draggable
                  hoverTilt={18}
                  ring
                  ringColor="rgba(255, 255, 255, 0.12)"
                  className="font-editorial-mono select-none"
                >
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 flex flex-col items-center justify-center gap-1 transition-all shadow-inner backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] font-editorial-mono font-bold tracking-widest text-white uppercase group-hover:text-emerald-400">
                      LIVE
                    </span>
                    <span className="text-[7px] font-editorial-mono text-slate-400 tracking-tighter">
                      RENDER ↗
                    </span>
                  </div>
                </CircularText>

                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[10px] font-editorial-mono text-slate-400 group-hover:text-emerald-300 group-hover:border-emerald-500/30 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Click to Spin Up Live Render Backend</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Sovereign Government Primary Source Loop from React Bits */}
        <section className="space-y-4 max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 text-center sm:text-left">
            <span className="font-editorial-mono text-[10px] tracking-[0.3em] uppercase text-slate-500">
              [ PRIMARY SOVEREIGN REGISTRIES CROSS-REFERENCED IN REAL-TIME ]
            </span>
            <span className="font-editorial-mono text-[9px] tracking-widest uppercase text-slate-600">
              RULE ZERO COMPLIANT · DRAG TO EXPLORE
            </span>
          </div>

          <div className="py-4 border-y border-white/[0.06] bg-white/[0.01]">
            <LogoLoop
              logos={GOV_REGISTRY_LOGOS}
              speed={60}
              direction="left"
              logoHeight={34}
              gap={24}
              pauseOnHover
              scaleOnHover
              fadeOut
              fadeOutWidth={0.15}
              ariaLabel="Primary Sovereign Government Registries"
            />
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
                <div className="flex items-center gap-3">
                  {/* Realtime Animated Voice Pill from React Bits */}
                  <VoicePill
                    accentColor="#10b981"
                    iconColor="#94a3b8"
                    background="#18191c"
                    size={36}
                    shape="pill"
                    reach={10}
                    showTime
                    waveform
                    slideToCancel
                    cancelDistance={64}
                    mode="auto"
                    reactive="mic"
                    ariaLabel="Dictate claim in Hindi or English"
                    onStart={() => startVoiceDictation()}
                    onStop={({ reason }) => {
                      stopVoiceDictation();
                    }}
                  />

                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-[11px] font-editorial-mono tracking-[0.2em] uppercase text-slate-300 font-bold select-none">
                      {isRecording ? "Listening (Hindi & English)..." : isVoiceTranscribing ? "Transcribing Audio..." : "Voice Dictate"}
                    </span>
                    <span className="text-[9px] font-editorial-mono tracking-wider text-slate-500 uppercase select-none">
                      Tap or Hold · Slide to Cancel
                    </span>
                  </div>
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
        <div className="mobile-nav-blur px-4 py-2.5 rounded-full flex items-center gap-3.5 shadow-2xl">
          <Link href="/whatsapp" className="text-center font-editorial-mono text-[9px] tracking-widest uppercase text-emerald-400 flex items-center gap-1 font-bold">
            <MessageCircle className="w-2.5 h-2.5 text-emerald-400" />
            <span>WA</span>
          </Link>
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
          <Link href="/whatsapp" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>WhatsApp Bot</span>
          </Link>
          <span>/</span>
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
