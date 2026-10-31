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
  const [lang, setLang] = useState<"hi" | "en">("en");

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
            {lang === "en" ? "About Sarkari Sach (सरकारी सच)" : "सरकारी सच (Sarkari Sach) के बारे में"}
          </h1>
          <p className="text-sm sm:text-base text-ink-subtle max-w-2xl leading-relaxed">
            {lang === "en"
              ? "Sarkari Sach is an automated primary-source verifier for government claims, forged notices, and viral circulars. It never relies on an AI model's ungrounded 'opinion', but operates strictly over official Central Government primary gazettes and notifications."
              : "यह प्रणाली किसी 'एआई मॉडल की राय' से नहीं, बल्कि भारत सरकार के प्राथमिक आधिकारिक दस्तावेज़ों (राजपत्र, पीआईबी, सरकारी पोर्टल्स) के आधार पर काम करती है।"}
          </p>
        </div>

        {/* 1. Rule Zero Banner */}
        <div className="bg-brand text-white p-6 sm:p-8 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-brand-accent font-bold text-xs uppercase tracking-widest">
            <FileCheck className="w-4 h-4" />
            <span>{lang === "en" ? "Foundational Axiom (Rule Zero)" : "आधारभूत सिद्धांत (Rule Zero)"}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            &ldquo;No citation, no verdict. When unsure, abstain.&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
            {lang === "en"
              ? "If no official government gazette, scheme guideline, or PIB debunk confirms a claim, the system never invents citations. It outputs UNVERIFIABLE and supplies safe citizen guidance to prevent fraudulent transactions."
              : "यदि किसी संदेश का कोई पुष्ट सरकारी दस्तावेज़ नहीं मिलता, तो मॉडल कभी मनगढ़ंत राय नहीं देता। वह साफ कहता है: 'पुष्टि नहीं हो सकी (UNVERIFIABLE)' और सुरक्षित रहने के निर्देश देता है।"}
          </p>
        </div>

        {/* 2. Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-canvas-line space-y-2 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3 className="text-base font-bold text-ink">
              {lang === "en" ? "Primary Source Corpus" : "प्राथमिक स्रोत (Primary Sources)"}
            </h3>
            <p className="text-xs text-ink-subtle leading-relaxed">
              {lang === "en"
                ? "Restricted strictly to .gov.in, .nic.in, The Gazette of India, and official Press Information Bureau releases. Third-party commercial blogs or unverified links are never accepted as authority."
                : "केवल .gov.in, .nic.in, e-Gazette और PIB Fact Check का उपयोग। किसी भी अनधिकृत समाचार ब्लॉग या अनवेरिफाइड वेबसाइट को प्रमाण नहीं माना जाता।"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-canvas-line space-y-2 shadow-sm">
            <Lock className="w-6 h-6 text-brand" />
            <h3 className="text-base font-bold text-ink">
              {lang === "en" ? "Forensic Signal Engine" : "फोरेंसिक व सुरक्षा संकेत (Forensics)"}
            </h3>
            <p className="text-xs text-ink-subtle leading-relaxed">
              {lang === "en"
                ? "Evaluates brand typosquatting, suspicious TLDs (.top, .icu, .xyz), unauthorized fee contradictions on free schemes, and consumer PDF metadata signatures."
                : "डोमेन स्पूफिंग, संदिग्ध TLD (.top, .icu), मुफ्त योजनाओं पर अवैध आवेदन शुल्क, और गैर-सरकारी PDF सॉफ्टवेयर का तकनीकी पता लगाता है।"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-canvas-line space-y-2 shadow-sm">
            <BookOpen className="w-6 h-6 text-amber-600" />
            <h3 className="text-base font-bold text-ink">
              {lang === "en" ? "Directed Lineage Graph" : "अधिसूचना वंशावली (Lineage Graph)"}
            </h3>
            <p className="text-xs text-ink-subtle leading-relaxed">
              {lang === "en"
                ? "Traces the chronological supersession of administrative orders (e.g. F.No. 1-1/2019 superseded by G.S.R. 552(E)) to ensure outdated circulars are correctly identified."
                : "सर्कुलर और गजट आदेशों का समयबद्ध इतिहास। यदि कोई पुराना आदेश नए नियम से बदला जा चुका है, तो उसे OUTDATED घोषित करता है।"}
            </p>
          </div>
        </div>

        {/* 3. DPDP Compliance Note */}
        <div className="bg-white rounded-3xl border border-canvas-line p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-ink font-bold text-base">
            <HeartHandshake className="w-5 h-5 text-brand" />
            <span>
              {lang === "en"
                ? "Citizen Privacy & DPDP Act 2023 Compliance"
                : "नागरिक गोपनीयता व DPDP अधिनियम 2023 अनुपालन"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-subtle leading-relaxed">
            {lang === "en"
              ? "We believe trust requires strict privacy. Incoming claims are automatically redacted for Aadhaar numbers, phone numbers, and bank account details prior to verification. Verification checks expire after 24 hours unless explicitly bookmarked."
              : "हमारा मानना है कि विश्वास की पहली शर्त गोपनीयता है। प्राप्त संदेशों में से आधार संख्या, फोन नंबर या बैंक विवरण स्वतः हटा दिए जाते हैं। आपकी कोई भी व्यक्तिगत जानकारी स्टोर नहीं की जाती।"}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink font-medium">
            <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{lang === "en" ? "Automatic PII Redaction (Aadhaar, Phone, Bank)" : "ऑटोमैटिक PII रेडैक्शन (Aadhaar, Phone, Bank)"}</span>
            </li>
            <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{lang === "en" ? "Ephemeral 24-hour retention window" : "24 घंटे में स्वतः डेटा निष्कासन"}</span>
            </li>
            <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{lang === "en" ? "Zero ad trackers or third-party profiling" : "शून्य विज्ञापन ट्रैकिंग व प्रोफाइलिंग"}</span>
            </li>
            <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{lang === "en" ? "Public audit trail with deterministic hashes" : "अपरिवर्तनीय क्रिप्टोग्राफ़िक ऑडिट लॉग"}</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
