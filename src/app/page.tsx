import { ArrowRight, Activity } from "lucide-react";
import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-brand-light selection:text-white">
      
      {/* Refined Ambient Background Effects */}
      <div className="absolute inset-0 w-full h-full opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-mid rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-light/30 rounded-full blur-[150px] mix-blend-screen"></div>
      </div>

      {/* Glassmorphism Card Container */}
      <div className="relative z-10 max-w-lg w-full backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-10 md:p-14 flex flex-col items-center text-center shadow-2xl">
        
        {/* Logo Mark */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-brand-light rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
          <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <Activity className="w-10 h-10 text-brand-dark" strokeWidth={1.5} />
          </div>
        </div>

        {/* Brand Header (Using Ubuntu per guidelines) */}
        <div className="mb-10">
          <h1 className="font-logo text-3xl md:text-4xl font-bold tracking-wide mb-2 text-white">
            COACH STRONG
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-[1px] bg-brand-grey/50"></div>
            <p className="text-brand-green font-sans font-bold tracking-[0.2em] uppercase text-xs">
              Inspire Change
            </p>
            <div className="w-8 h-[1px] bg-brand-grey/50"></div>
          </div>
        </div>

        {/* Primary Heading (Using Bebas Neue per guidelines) */}
        <div className="py-6 border-y border-white/10 w-full mb-10">
          <h2 className="font-heading text-4xl md:text-5xl tracking-wide leading-tight text-white/95">
            HEALTH IS YOUR MOST <br />
            <span className="text-brand-light">VALUABLE COMMODITY.</span>
          </h2>
        </div>

        {/* Action Button */}
        <div className="w-full">
          <Link 
            href="/login"
            className="group relative w-full bg-white text-brand-dark font-sans font-bold text-sm tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-3 overflow-hidden transition-all hover:bg-brand-sand hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
          >
            Log in to Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-6 text-brand-grey font-sans text-sm font-light">
            High Performance Health & Wellbeing
          </p>
        </div>

      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-brand-grey/50 font-sans text-xs tracking-widest uppercase">
        Powered by DreamStorm
      </p>
    </main>
  );
}