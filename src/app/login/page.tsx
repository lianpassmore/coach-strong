"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Mail, Loader2, Lock, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "password" | "magic-link" | "sent";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailContinue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/has-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { hasPassword } = await res.json();
      setStep(hasPassword ? "password" : "magic-link");
    } catch {
      setStep("magic-link");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      setError("Incorrect password. Try again or use a magic link.");
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleMagicLink = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("sent");
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col justify-center items-center px-6 relative overflow-hidden">

      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-light/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-24 w-80 h-80 bg-brand-mid/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full">

        {/* LOGO & BRANDING */}
        <div className="flex flex-col items-center justify-center mb-8">
          <Image
            src="/Logo_square_OG.png"
            alt="Inspire Change"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <h1 className="font-logo text-sm font-bold tracking-[0.3em] text-white mt-4 opacity-50">
            COACH STRONG
          </h1>
        </div>

        {/* AUTHENTICATION CARD */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">

          {/* STEP: EMAIL */}
          {step === "email" && (
            <>
              <div className="text-center mb-6">
                <h2 className="font-heading text-2xl tracking-wide text-white mb-2">SIGN IN</h2>
                <p className="text-brand-sand/60 text-xs leading-relaxed">
                  Sign in with Google or enter your email to continue.
                </p>
              </div>

              {/* GOOGLE LOGIN */}
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full bg-white text-brand-dark font-bold text-xs uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-5 shadow-lg"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* DIVIDER */}
              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {/* EMAIL FORM */}
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-brand-grey" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email..."
                    className="w-full bg-white/5 text-white placeholder:text-brand-grey/50 pl-12 pr-4 py-4 rounded-xl text-sm font-bold outline-none border border-white/10 focus:border-brand-light/50 focus:bg-white/10 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs font-bold text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading || !email}
                  className="w-full bg-brand-dark border border-white/20 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {/* STEP: PASSWORD */}
          {step === "password" && (
            <>
              <button
                onClick={() => { setStep("email"); setError(null); setPassword(""); }}
                className="flex items-center gap-1.5 text-white/40 text-[10px] font-black uppercase tracking-widest mb-5 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="text-center mb-6">
                <h2 className="font-heading text-2xl tracking-wide text-white mb-2">SIGN IN</h2>
                <p className="text-brand-sand/60 text-xs leading-relaxed truncate">{email}</p>
              </div>

              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-brand-grey" />
                  </div>
                  <input
                    type="password"
                    required
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-white/5 text-white placeholder:text-brand-grey/50 pl-12 pr-4 py-4 rounded-xl text-sm font-bold outline-none border border-white/10 focus:border-brand-light/50 focus:bg-white/10 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs font-bold text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="w-full bg-brand-light text-brand-dark font-bold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <button
                onClick={() => handleMagicLink()}
                disabled={isLoading}
                className="w-full mt-4 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white/70 transition-colors text-center"
              >
                Use magic link instead
              </button>
            </>
          )}

          {/* STEP: MAGIC LINK */}
          {step === "magic-link" && (
            <>
              <button
                onClick={() => { setStep("email"); setError(null); }}
                className="flex items-center gap-1.5 text-white/40 text-[10px] font-black uppercase tracking-widest mb-5 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="text-center mb-6">
                <h2 className="font-heading text-2xl tracking-wide text-white mb-2">SIGN IN</h2>
                <p className="text-brand-sand/60 text-xs leading-relaxed">
                  We&apos;ll send a secure magic link to your inbox.
                </p>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-brand-grey" />
                  </div>
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="w-full bg-white/5 text-white/60 pl-12 pr-4 py-4 rounded-xl text-sm font-bold outline-none border border-white/10 cursor-default"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs font-bold text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand-dark border border-white/20 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Magic Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {/* STEP: SENT */}
          {step === "sent" && (
            <div className="text-center py-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-brand-green" />
              </div>
              <h2 className="font-heading text-2xl tracking-wide text-white">CHECK INBOX</h2>
              <p className="text-brand-sand/80 text-xs font-light leading-relaxed">
                We&apos;ve sent a secure login link to <br /><span className="text-white font-bold">{email}</span>.
              </p>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
