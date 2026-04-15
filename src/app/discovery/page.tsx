"use client";
import { Mic, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function DiscoveryPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-brand-dark text-white font-sans flex flex-col relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-light/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-mid/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-12 pb-6 flex items-center justify-between">
        <Image
          src="/Logo_landscape_OG.png"
          alt="Inspire Change"
          width={120}
          height={34}
          className="brightness-0 invert opacity-80"
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-brand-light">
          Stage 0b
        </span>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center max-w-sm mx-auto w-full">

        {/* Orb icon */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-brand-light/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 bg-gradient-to-tr from-brand-light to-[#0de0ff] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(5,171,196,0.5)]">
            <Mic className="w-12 h-12 text-white drop-shadow-md" />
          </div>
        </div>

        <h1 className="font-heading text-4xl tracking-widest mb-4 leading-tight">
          YOUR DISCOVERY<br />INTERVIEW
        </h1>

        <p className="text-white/70 text-sm leading-relaxed mb-8">
          Coach Strong will now have a <strong className="text-white">10–15 minute voice conversation</strong> with you to understand your deeper goals, values, and what success really looks like for you.
        </p>

        <div className="w-full space-y-4 text-left mb-10">
          {[
            { title: "Not a re-test", desc: "Coach Strong already has your form answers. This is a deeper conversation, not a repeat." },
            { title: "Your one word", desc: "Together you'll refine your focus word and explore the why behind your goals." },
            { title: "Speak freely", desc: "There are no right or wrong answers. Be honest — it helps Eske build the best plan for you." },
          ].map(({ title, desc }) => (
            <div key={title} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="w-2 h-2 rounded-full bg-brand-light mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-sm text-white mb-0.5">{title}</p>
                <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/40 mb-6">
          Find somewhere quiet, put headphones in if you can.
        </p>

        <button
          onClick={() => router.push("/voice-session?mode=discovery")}
          className="w-full bg-brand-light text-brand-dark font-bold text-sm tracking-widest uppercase py-5 rounded-2xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(5,171,196,0.4)]"
        >
          <Mic className="w-5 h-5" />
          Start Discovery Interview
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <div className="h-10" />
    </main>
  );
}
