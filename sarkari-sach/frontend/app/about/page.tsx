"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  ShieldCheck,
  Scale,
  Lock,
  FileCheck,
  HeartHandshake,
  BookOpen,
} from "lucide-react";

export default function AboutPage() {
  const [lang, setLang] = useState<"hi" | "en">("hi");

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar lang={lang} setLang={setLang} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-10">
        {/* Title */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
            <Scale className="w-4 h-4" />
            <span>Civic Pulse, Digital Governance & Public Information</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            सरकारी सच (Sarkari Sach) के बारे में
          </h1>
          <p className="text-sm sm:text-base text-ink-subtle max-w-2xl leading-relaxed">
            यह प्रणाली किसी &lsquo;एआई मॉडल की राय&rsquo; से नहीं, बल्कि भारत सरकार के प्राथमिक आधिकारिक दस्तावेज़ों (राजपत्र, पीआईबी, सरकारी पोर्टल्स) के आधार पर काम करती है।
          </p>
        </div>

        {/* 1. Rule Zero Banner */}
        <div className="bg-brand text-white p-6 sm:p-8 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-brand-accent font-bold text-xs uppercase tracking-widest">
            <FileCheck className="w-4 h-4" />
            <span>आधारभूत सिद्धांत (Rule Zero)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            &ldquo;बिना सरकारी उद्धरण कोई निर्णय नहीं। जब संदेह हो, पुष्टि अस्वीकार।&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
            (No citation, no verdict. When unsure, abstain.) यदि किसी संदेश का कोई पुष्ट सरकारी दस्तावेज़ नहीं मिलता, तो मॉडल कभी मनगढ़ंत राय नहीं देता। वह साफ कहता है: &ldquo;पुष्टि नहीं हो सकी (UNVERIFIABLE)&rdquo; और सुरक्षित रहने के निर्देश देता है।
          </p>
        </div>

        {/* 2. Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-canvas-line space-y-2 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3 className="text-base font-bold text-ink">प्राथमिक स्रोत (Primary Sources)</h3>
            <p className="text-xs text-ink-subtle leading-relaxed">
              केवल .gov.in, .nic.in, e-Gazette और PIB Fact Check का उपयोग। किसी भी अनधिकृत समाचार ब्लॉग या अनवेरिफाइड वेबसाइट को प्रमाण नहीं माना जाता।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-canvas-line space-y-2 shadow-sm">
            <Scale className="w-6 h-6 text-brand" />
            <h3 className="text-base font-bold text-ink">दृढ़ निर्णय नियम (Deterministic Verdicts)</h3>
            <p className="text-xs text-ink-subtle leading-relaxed">
              एलएलएम (एआई) कभी अंतिम फैसला नहीं करता। कोड आधारित वर्ड्रिक्ट इंजन (Verdict Engine) नियमों के आधार पर 5 में से एक परिणाम तय करता है।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-canvas-line space-y-2 shadow-sm">
            <Lock className="w-6 h-6 text-amber-600" />
            <h3 className="text-base font-bold text-ink">गोपनीयता व सुरक्षा (Privacy First)</h3>
            <p className="text-xs text-ink-subtle leading-relaxed">
              डीपीडीपी (DPDP) अनुपालन। आधार, बैंक खाता व फोन नंबर तुरंत रेडैक्ट किए जाते हैं। 24 घंटे बाद अपलोड किए गए कच्चे दस्तावेज स्वतः नष्ट हो जाते हैं।
            </p>
          </div>
        </div>

        {/* 3. The 5 Verdicts Explained */}
        <div className="bg-white rounded-3xl border border-canvas-line p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand" />
            <span>पाँच आधिकारिक परिणाम (The 5 Verdicts)</span>
          </h2>

          <div className="divide-y divide-canvas-line text-xs">
            <div className="py-3 flex items-start gap-3">
              <span className="font-extrabold px-2.5 py-1 rounded bg-[#E6F4EA] text-[#0B7A3E] shrink-0">
                CONFIRMED
              </span>
              <p className="text-ink leading-relaxed">
                दावा वर्तमान सरकारी अधिसूचना और प्रावधानों से पूरी तरह मेल खाता है। उद्धरण संलग्न।
              </p>
            </div>

            <div className="py-3 flex items-start gap-3">
              <span className="font-extrabold px-2.5 py-1 rounded bg-[#FFEBD5] text-[#B45309] shrink-0">
                ALTERED
              </span>
              <p className="text-ink leading-relaxed">
                वास्तविक सरकारी योजना मौजूद है, लेकिन संदेश में राशि, तारीख या पात्रता में जानबूझकर फेरबदल किया गया है।
              </p>
            </div>

            <div className="py-3 flex items-start gap-3">
              <span className="font-extrabold px-2.5 py-1 rounded bg-[#FFF3D6] text-[#8A5A00] shrink-0">
                OUTDATED
              </span>
              <p className="text-ink leading-relaxed">
                यह नियम कभी सत्य था, परंतु बाद के सरकारी आदेश द्वारा बदल या रद्द कर दिया गया है।
              </p>
            </div>

            <div className="py-3 flex items-start gap-3">
              <span className="font-extrabold px-2.5 py-1 rounded bg-[#FDE7E5] text-[#B3261E] shrink-0">
                FORGED
              </span>
              <p className="text-ink leading-relaxed">
                नकली नोटिस या फ़िशिंग लिंक। कम से कम दो स्वतंत्र तकनीकी साक्ष्य (जैसे नकल डोमेन + अनधिकृत शुल्क) या PIB Fact Check की सीधी पुष्टि आवश्यक।
              </p>
            </div>

            <div className="py-3 flex items-start gap-3">
              <span className="font-extrabold px-2.5 py-1 rounded bg-[#EEF2F6] text-[#475569] shrink-0">
                UNVERIFIABLE
              </span>
              <p className="text-ink leading-relaxed">
                सरकारी अभिलेखों में पुष्टि हेतु पर्याप्त साक्ष्य नहीं मिले। अफवाह से बचने व आधिकारिक साइट पर जाँचने की सलाह।
              </p>
            </div>
          </div>
        </div>

        {/* 4. Responsible AI & Threat Model */}
        <div className="bg-slate-50 rounded-3xl border border-canvas-line p-6 space-y-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-brand" />
            <span>जिम्मेदार एआई प्रतिबद्धता (Responsible AI)</span>
          </h3>
          <p className="text-xs text-ink-subtle leading-relaxed">
            सर्कुलर्स व कानूनी अधिकारों की व्याख्या प्रत्येक नागरिक के लिए महत्वपूर्ण है। सरकारी सच कभी कानूनी सलाह नहीं देता; यह केवल दस्तावेज़ी सत्यता की निष्पक्ष रिपोर्ट प्रस्तुत करता है। किसी भी असंतोष या अपील के लिए ऑडिट पृष्ठ पर &lsquo;प्रतिक्रिया (Feedback)&rsquo; विकल्प सदैव उपलब्ध रहता है।
          </p>
        </div>
      </main>
    </div>
  );
}

