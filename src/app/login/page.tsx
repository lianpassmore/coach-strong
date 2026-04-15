"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Mail, Lock } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        setError(error.message);
      } else {
        // Check admin status and route accordingly
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();
        setIsLoading(false);
        window.location.href = profile?.is_admin ? '/admin' : '/dashboard';
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      setIsLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setIsSubmitted(true);
      }
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
    // On success, browser redirects to Google — no need to reset loading
  };

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col justify-center items-center px-6 py-4 relative overflow-hidden selection:bg-brand-light selection:text-white">

      {/* Ambient Background Effects */}
      <div className="absolute inset-0 w-full h-full opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-mid rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-light/30 rounded-full blur-[150px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 max-w-sm w-full">

        {/* Logo Mark */}
        <div className="flex flex-col items-center justify-center mb-5">
          <Image
            src="/Logo_square_OG.png"
            alt="Inspire Change"
            width={100}
            height={100}
            className="drop-shadow-xl"
          />
          <h1 className="font-logo text-lg font-bold tracking-widest text-white mt-2 opacity-80">
            COACH STRONG AI
          </h1>
        </div>

        {/* Authentication Card */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-5">
                <h2 className="font-heading text-2xl tracking-wide text-white mb-2">WELCOME BACK</h2>
                <p className="text-brand-sand/80 text-sm font-light">
                  Sign in with Google or get a magic link sent to your email.
                </p>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full bg-white text-brand-dark font-sans font-bold text-sm tracking-wide py-3 rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-brand-sand disabled:opacity-70 disabled:cursor-not-allowed mb-5"
              >
                {isGoogleLoading ? (
                  "Redirecting..."
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-brand-grey text-xs font-bold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {/* Email + Password / Magic Link */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-brand-grey" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full bg-white/10 text-white placeholder:text-brand-grey/70 pl-12 pr-4 py-3 rounded-xl text-sm font-bold outline-none border border-white/10 focus:border-brand-light/70 focus:bg-white/20 transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-brand-grey" />
                  </div>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (optional)"
                    className="w-full bg-white/10 text-white placeholder:text-brand-grey/70 pl-12 pr-4 py-3 rounded-xl text-sm font-bold outline-none border border-white/10 focus:border-brand-light/70 focus:bg-white/20 transition-all"
                  />
                </div>

                <p className="text-brand-grey/60 text-xs text-center">
                  {password ? "Sign in with your password" : "Leave password blank to receive a magic link"}
                </p>

                {error && (
                  <p className="text-red-400 text-xs font-bold text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="group relative w-full bg-white/10 border border-white/20 text-white font-sans font-bold text-sm tracking-widest uppercase py-3 rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-white/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (password ? "Signing in..." : "Sending...") : (password ? "Sign In" : "Send Magic Link")}
                  {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-brand-green" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide text-white">CHECK YOUR INBOX</h2>
              <p className="text-brand-sand/80 text-sm font-light leading-relaxed">
                We've sent a secure login link to <span className="text-white font-bold">{email}</span>. Click the link to access your dashboard.
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
