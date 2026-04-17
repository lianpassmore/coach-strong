"use client";
import { Suspense } from "react";
import { Mic, ArrowRight, Headphones, Volume2, Sparkles, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// 1. Wrap the UI in a Content component
function DiscoveryContent() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-brand-dark text-white font-sans flex flex-col relative overflow-hidden">
      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-light/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-24 w-80 h-80 bg-brand-mid/10 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER */}
      <header className="relative z-10 px-8 pt-12 flex items-center justify-between">
        <Image
          src="/Logo_landscape_OG.png"
          alt="Inspire Change"
          width={110}
          height={30}
          className="brightness-0 invert opacity-60"
        />
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
           <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-light">Initialization</p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center max-w-sm mx-auto w-full pb-12">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-brand-light/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute inset-0 bg-[#0de0ff]/10 rounded-full blur-xl animate-pulse delay-700" />
          <div className="relative w-32 h-32 bg-gradient-to-tr from-brand-dark via-[#1a15a3] to-brand-light rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(5,171,196,0.3)] border border-white/10">
            <Mic className="w-12 h-12 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            <div className="absolute inset-0 border border-brand-light/20 rounded-full scale-125 animate-[spin_10s_linear_infinite]" />
          </div>
        </div>

        <h1 className="font-heading text-4xl tracking-widest mb-4 leading-none">MEET YOUR<br />COACH STRONG</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-10 px-2">
          Coach Strong has processed your data. She is now ready for your <span className="text-brand-light font-bold">Discovery Interview</span> to finalize your 8-week roadmap.
        </p>

        <div className="w-full space-y-3 mb-10">
          <FeatureItem icon={<Sparkles className="w-4 h-4" />} title="Deep Context" desc="She already knows your goals. This is about the 'Why'." />
          <FeatureItem icon={<ShieldCheck className="w-4 h-4" />} title="Safe Space" desc="Speak freely. Your honesty builds a more accurate plan." />
        </div>

        <div className="flex items-center gap-6 mb-10 opacity-50">
           <div className="flex flex-col items-center gap-1">
              <Headphones className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Headphones</span>
           </div>
           <div className="w-px h-6 bg-white/20" />
           <div className="flex flex-col items-center gap-1">
              <Volume2 className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Quiet Space</span>
           </div>
        </div>

        <button
          onClick={() => router.push("/voice-session?mode=discovery")}
          className="w-full bg-brand-light text-brand-dark font-bold text-sm tracking-widest uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(5,171,196,0.3)]"
        >
          Begin Discovery
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="mt-4 text-[10px] text-white/30 uppercase tracking-[0.2em]">Est. Duration: 10–12 Minutes</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors"
        >
          Skip for now — I&apos;ll do this on my first session
        </button>
      </div>
    </main>
  );
}

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 text-left backdrop-blur-sm">
      <div className="w-8 h-8 rounded-xl bg-brand-light/10 flex items-center justify-center shrink-0 text-brand-light">{icon}</div>
      <div>
        <p className="font-bold text-sm text-white">{title}</p>
        <p className="text-xs text-white/50 leading-tight">{desc}</p>
      </div>
    </div>
  );
}

// 2. Export the component wrapped in Suspense
export default function DiscoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-dark" />}>
      <DiscoveryContent />
    </Suspense>
  );
}