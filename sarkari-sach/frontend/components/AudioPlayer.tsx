"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, Play, Pause, Loader2 } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface AudioPlayerProps {
  audioUrl?: string;
  ttsText?: string;
  lang?: string;
}

export default function AudioPlayer({ audioUrl, ttsText, lang = "hi" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const togglePlayAudio = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // 1. First Priority: Use the exact same backend audio URL & voice note as the WhatsApp window
    if (audioUrl) {
      const resolvedUrl = getApiUrl(audioUrl);
      setIsLoading(true);

      if (audioRef.current && audioRef.current.src === resolvedUrl) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(() => fallbackSpeechSynthesis());
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(resolvedUrl);
      audioRef.current = audio;

      audio.oncanplay = () => {
        setIsLoading(false);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        fallbackSpeechSynthesis();
      };

      audio.play().catch((err) => {
        console.warn("Audio play prevented or failed, falling back to speech synthesis:", err);
        setIsLoading(false);
        fallbackSpeechSynthesis();
      });
      return;
    }

    fallbackSpeechSynthesis();
  };

  const fallbackSpeechSynthesis = () => {
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

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  return (
    <div className="flex items-center gap-3 bg-brand/5 border border-brand/10 p-3 rounded-xl my-4">
      <button
        onClick={togglePlayAudio}
        disabled={isLoading}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm flex-shrink-0 ${
          isPlaying ? "bg-red-600 text-white" : "bg-[#183B56] text-white hover:bg-[#122c42]"
        }`}
        title={isPlaying ? "Pause audio" : "Listen to official voice explanation"}
        aria-label={isPlaying ? "Pause audio" : "Listen to official voice explanation"}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 fill-white ml-0.5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-brand flex-shrink-0" />
          <span className="text-xs font-bold text-ink">
            {isLoading
              ? (lang === "en" ? "Loading official voice..." : "ऑडियो लोड हो रहा है...")
              : isPlaying
              ? (lang === "en" ? "Playing official voice reply..." : "वॉइस नोट चल रहा है...")
              : (lang === "en" ? "Listen to Voice Reply (Spoken Audio)" : "बोलकर सुनें (Voice Reply)")}
          </span>
        </div>
        <p className="text-[11px] text-ink-subtle truncate">
          {ttsText
            ? `"${ttsText.slice(0, 85)}..."`
            : (lang === "en" ? "Official spoken voice summary" : "रीडिंग स्तर: ग्रेड 6, आधिकारिक हिंदी वॉइस नोट")}
        </p>
      </div>
    </div>
  );
}
