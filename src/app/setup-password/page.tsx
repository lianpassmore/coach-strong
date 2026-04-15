"use client";
import { useState } from "react";
import { Lock, ShieldCheck, Loader2, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function SetupPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <main className="min-h-screen bg-brand-sand flex flex-col text-brand-dark overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-brand-dark text-white pt-12 pb-14 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <Image src="/Logo_square_OG.png" alt="Logo" width={60} height={60} className="mb-4 opacity-80" />
          <h1 className="font-heading text-3xl tracking-wider leading-none uppercase">Secure Access</h1>
          <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-2">Finalizing Your Calibration</p>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10 w-full">
        
        {/* ACTION CARD */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-brand-sand">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-dark/20">
              <ShieldCheck className="w-6 h-6 text-brand-light" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark leading-tight">Create your password</p>
              <p className="text-xs text-brand-grey mt-1">This secures your data and makes future logins instant.</p>
            </div>
          </div>

          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-brand-grey" />
              </div>
              <input
                type="password"
                placeholder="New Password"
                className="w-full bg-brand-sand pl-12 pr-4 py-4 rounded-2xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Check className="h-4 w-4 text-brand-grey" />
              </div>
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full bg-brand-sand pl-12 pr-4 py-4 rounded-2xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-[10px] font-black uppercase text-red-500 text-center px-4 tracking-wider">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full mt-4 py-5 bg-brand-dark text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-30"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Account"}
              {!loading && <ArrowRight className="w-5 h-5 text-brand-light" />}
            </button>
          </form>
        </section>

        {/* TRUST NOTE */}
        <p className="text-[9px] text-brand-grey font-medium text-center px-10 leading-relaxed uppercase tracking-widest opacity-60">
          Passwords must be at least 8 characters. <br />
          You can also use a magic link if you ever forget.
        </p>
      </div>
    </main>
  );
}