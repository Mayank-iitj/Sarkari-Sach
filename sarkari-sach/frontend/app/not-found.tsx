import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C0E] text-white px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-amber-400" />
      </div>
      <h1 className="font-editorial-serif italic text-4xl sm:text-5xl mb-3">Record Not Found</h1>
      <p className="text-sm font-editorial-mono text-slate-400 max-w-md mb-8">
        The requested statutory gazette or verification report does not exist in the provenance registry.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-editorial-mono text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Verifier</span>
      </Link>
    </div>
  );
}
