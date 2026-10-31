"use client";

import { useState, useRef } from "react";
import { Volume2, Play, Square } from "lucide-react";

interface AudioPlayerProps {
  audioUrl?: string;
  ttsText?: string;
  lang?: string;
}

export default function AudioPlayer({ audioUrl, ttsText, lang = "en" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Audio playback not supported on this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const textToSpeak = ttsText || (lang === "en" ? "Sarkari Sach verification report is ready." : "सरकारी सच सत्यापन रिपोर्ट तैयार है।");
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    synthRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="flex items-center gap-3 bg-brand/5 border border-brand/10 p-3 rounded-xl my-4">
      <button
        onClick={toggleSpeech}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm ${
          isPlaying ? "bg-red-600 text-white" : "bg-brand text-white hover:bg-brand-dark"
        }`}
        title={isPlaying ? "Stop audio" : "Listen to audio explanation"}
      >
        {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      <div>
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-ink">
            {isPlaying
              ? (lang === "en" ? "Playing audio..." : "ऑडियो चल रहा है...")
              : (lang === "en" ? "Listen to Voice Reply (Spoken Audio)" : "बोलकर सुनें (Voice Reply)")}
          </span>
        </div>
        <p className="text-[11px] text-ink-subtle">
          {ttsText
            ? `"${ttsText.slice(0, 75)}..."`
            : (lang === "en" ? "Reading level: Grade 6 plain language summary" : "रीडिंग स्तर: ग्रेड 6, आसान भाषा में उत्तर")}
        </p>
      </div>
    </div>
  );
}
