"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getApiUrl } from "@/lib/api";
import {
  Send,
  MessageCircle,
  ShieldCheck,
  CheckCheck,
  Play,
  Pause,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Smartphone,
  Share2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  cardUrl?: string;
  audioUrl?: string;
  verdict?: string;
  publicId?: string;
}

const PRESETS = [
  {
    title: "Fake Registration Fee (FORGED)",
    text: "PM Kisan registration open. Pay ₹250 fee on pmkisan-yojana.in to get ₹12,000 installment immediately!",
  },
  {
    title: "Altered Notice (ALTERED)",
    text: "Notification G.S.R. 552(E): Under PM-KISAN, the annual financial benefit has been increased from ₹6,000 to ₹12,000.",
  },
  {
    title: "Outdated Order (OUTDATED)",
    text: "Is notification F.No. 1-1/2019-Credit-I dated 24th February 2019 still the operative rule for PM-KISAN disbursement?",
  },
  {
    title: "Vague Rumor (ABSTAIN)",
    text: "Government is giving free laptops next month to anyone who fills an online form, forward to everyone immediately!",
  },
];

export default function WhatsAppSimulatorPage() {
  const [lang, setLang] = useState<"hi" | "en">("en");
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "bot",
      text: "🏛️ *Namaste! Welcome to Sarkari Sach (सरकारी सच)*\n\nI am the official AI verification bot for Central Government claims, circulars, and notices.\n\n*Forward any WhatsApp message, poster, or link* to verify its legal authenticity against The Gazette of India and PIB records.",
      time: "10:30 AM",
    },
  ]);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      time: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const res = await fetch(getApiUrl("/v1/whatsapp/simulate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, reply_lang: "hi" }),
      });

      if (res.ok) {
        const data = await res.json();
        const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: data.bot_reply_text,
          time: botTime,
          cardUrl: getApiUrl(data.card_url),
          audioUrl: getApiUrl(data.audio_url),
          verdict: data.verdict,
          publicId: data.public_id,
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const togglePlayAudio = (url: string) => {
    if (isPlayingAudio === url) {
      setIsPlayingAudio(null);
    } else {
      setIsPlayingAudio(url);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setIsPlayingAudio(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080808] text-white">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-editorial-mono text-[10px] tracking-widest uppercase">
            <Smartphone className="w-3.5 h-3.5" />
            <span>INTERACTIVE WHATSAPP BOT SANDBOX</span>
          </div>

          <h1 className="font-editorial-serif italic text-3xl sm:text-5xl text-white">
            WhatsApp Verification Playground
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-light">
            Test how Sarkari Sach responds in WhatsApp groups when viral rumors land.
            The bot returns structured text, voice notes in Hindi, and a 1080×1080 verified card.
          </p>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Preset Scenarios & Architecture Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-obsidian rounded-3xl p-6 border border-white/10 space-y-4">
              <h3 className="font-editorial-mono text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Simulate Viral Scenarios</span>
              </h3>
              <p className="text-xs text-slate-400">
                Click any real scenario to inject it into the phone simulator:
              </p>

              <div className="space-y-2.5">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(p.text)}
                    disabled={isSending}
                    className="w-full text-left p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.05] transition-all group space-y-1"
                  >
                    <div className="font-editorial-mono text-[10px] text-emerald-400 tracking-wider font-bold">
                      {p.title}
                    </div>
                    <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      &ldquo;{p.text}&rdquo;
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Twilio Production Webhook Box */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 font-editorial-mono text-[11px]">
              <span className="text-slate-400 block tracking-wider uppercase font-bold">
                Production Webhook Endpoint:
              </span>
              <code className="text-emerald-400 bg-black/40 px-2 py-1 rounded block truncate">
                POST /v1/whatsapp/webhook
              </code>
              <p className="text-slate-500 text-[10px]">
                Complies with Twilio TwiML standard. Generates automatic voice notes via gTTS and share cards via Pillow/HTML5.
              </p>
            </div>
          </div>

          {/* Right Column: Realistic WhatsApp Phone Mockup */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[430px] rounded-[2.5rem] bg-[#111B21] border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[680px]">
              {/* WhatsApp Chat Top Header */}
              <div className="bg-[#202C33] px-4 py-3 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    🏛️
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      <span>Sarkari Sach Verified</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Official Fact-Check Assistant
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono">Online</span>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div
                className="flex-1 p-4 overflow-y-auto space-y-4"
                style={{
                  backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
                  backgroundSize: "20px 20px",
                }}
              >
                {messages.map((m) => {
                  const isUser = m.sender === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[88%] p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed space-y-2.5 ${
                          isUser
                            ? "bg-[#005C4B] text-slate-100 rounded-tr-none"
                            : "bg-[#202C33] text-slate-200 rounded-tl-none border border-slate-800"
                        }`}
                      >
                        {/* Text Message with Bold Formatting */}
                        <div className="whitespace-pre-wrap">{m.text}</div>

                        {/* Bot Voice Note Player */}
                        {m.audioUrl && (
                          <div className="p-2 rounded-xl bg-black/20 flex items-center gap-3 border border-white/5">
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(m.audioUrl!)}
                              className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center flex-shrink-0"
                            >
                              {isPlayingAudio === m.audioUrl ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1 text-[10px] font-mono text-slate-300">
                              🔊 Voice Explanation (Hindi TTS)
                            </div>
                          </div>
                        )}

                        {/* Bot Attached 1080x1080 Verified Card */}
                        {m.cardUrl && (
                          <div className="space-y-1.5 pt-1">
                            <img
                              src={m.cardUrl}
                              alt="Verified Card"
                              className="rounded-xl border border-white/10 w-full aspect-square object-cover"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                              <span>Verified Card (HD)</span>
                              {m.publicId && (
                                <Link
                                  href={`/c/${m.publicId}`}
                                  target="_blank"
                                  className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                                >
                                  <span>Audit Trail</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Message Timestamp & Double Blue Ticks */}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                          <span>{m.time}</span>
                          {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Sending Indicator */}
                {isSending && (
                  <div className="flex items-start">
                    <div className="bg-[#202C33] text-slate-300 px-3 py-2 rounded-xl rounded-tl-none text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Checking Gazette & PIB sources...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="bg-[#202C33] px-3 py-2.5 flex items-center gap-2 border-t border-slate-800 flex-shrink-0"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type or paste a message..."
                  className="flex-1 bg-[#2A3942] text-xs text-slate-200 placeholder:text-slate-500 rounded-xl px-3.5 py-2.5 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="w-9 h-9 rounded-xl bg-[#00A884] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#008f6f] transition-colors"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
