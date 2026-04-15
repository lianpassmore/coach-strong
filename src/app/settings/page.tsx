"use client";
import { useState, useEffect } from "react";
import { 
  Bell, Shield, ChevronRight, Lock, Loader2, X, Eye, 
  EyeOff, CheckCircle, Moon, CalendarDays, LogOut, Info 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const supabase = createClient();

export default function SettingsPage() {
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // State for preference toggles
  const [prefs, setPrefs] = useState({
    notify_push: true,
    cycle_tracking_enabled: false,
    show_week_planner: true
  });

  // Load preferences from Supabase on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("notify_push, cycle_tracking_enabled, show_week_planner")
        .eq("id", user.id)
        .single();
      if (data) setPrefs(data);
      setLoadingPrefs(false);
    }
    load();
  }, []);

  // Generic toggle handler
  async function togglePref(field: keyof typeof prefs) {
    const nextValue = !prefs[field];
    setPrefs(prev => ({ ...prev, [field]: nextValue }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ [field]: nextValue }).eq("id", user.id);
    }
  }

  if (loadingPrefs) {
    return (
      <div className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden">
      
      {/* 1. HEADER */}
      <header className="bg-brand-dark text-white pt-12 pb-10 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <HomeButton />
            <div>
               <h1 className="font-heading text-3xl tracking-wider leading-none uppercase">Settings</h1>
               <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">
                 Personalize Your Experience
               </p>
            </div>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10">

        {/* 2. NOTIFICATIONS SECTION */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest px-2">Alerts & Reminders</p>
          <section className="bg-white rounded-[2rem] shadow-sm border border-brand-sand overflow-hidden">
             <SettingToggle 
                icon={<Bell />} 
                label="Push Notifications" 
                desc="Daily check-ins & AI insights" 
                enabled={prefs.notify_push} 
                onToggle={() => togglePref('notify_push')} 
             />
          </section>
        </div>

        {/* 3. INTERFACE SECTION (Dashboard Widgets) */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest px-2">Dashboard Personalization</p>
          <section className="bg-white rounded-[2rem] shadow-sm border border-brand-sand overflow-hidden">
             <SettingToggle 
                icon={<CalendarDays />} 
                label="Weekly Plan Strip" 
                desc="Visual training schedule" 
                enabled={prefs.show_week_planner} 
                onToggle={() => togglePref('show_week_planner')} 
             />
             <div className="h-px bg-brand-sand mx-6" />
             <SettingToggle 
                icon={<Moon />} 
                label="Cycle Tracker" 
                desc="Integrate cycle health data" 
                enabled={prefs.cycle_tracking_enabled} 
                onToggle={() => togglePref('cycle_tracking_enabled')} 
             />
          </section>
        </div>

        {/* 4. SECURITY & TERMS */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest px-2">Security & Legal</p>
          <section className="bg-white rounded-[2rem] shadow-sm border border-brand-sand overflow-hidden">
             <SettingLink icon={<Lock />} label="Change Password" onClick={() => setShowPasswordModal(true)} />
             <div className="h-px bg-brand-sand mx-6" />
             <SettingLink icon={<Shield />} label="Privacy & Terms" />
             <div className="h-px bg-brand-sand mx-6" />
             <div className="px-6 py-4 flex justify-between items-center text-brand-grey">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-brand-sand rounded-xl"><Info className="w-5 h-5" /></div>
                  <span className="text-sm font-bold">App Version</span>
                </div>
                <span className="text-xs font-bold">v1.2.4</span>
             </div>
          </section>
        </div>

        {/* 5. LOGOUT ACTION */}
        <button 
          onClick={async () => { 
            await supabase.auth.signOut(); 
            window.location.href = '/login'; 
          }}
          className="w-full py-5 bg-white border border-red-100 text-red-500 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>

      </div>

      {/* MODAL: PASSWORD RESET */}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
    </main>
  );
}

/** 
 * HELPER COMPONENTS 
 */

function SettingToggle({ icon, label, desc, enabled, onToggle }: any) {
  return (
    <div className="p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-sand rounded-xl text-brand-dark">
          {Object.assign({}, icon, { props: { className: "w-5 h-5" } })}
        </div>
        <div>
          <h3 className="font-bold text-sm text-brand-dark leading-none mb-1">{label}</h3>
          <p className="text-[10px] text-brand-grey font-medium uppercase tracking-wider">{desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? "bg-brand-green" : "bg-brand-grey/20"}`}
      >
        <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function SettingLink({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full p-5 flex items-center justify-between active:bg-brand-sand/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-sand rounded-xl text-brand-dark">
           {Object.assign({}, icon, { props: { className: "w-5 h-5" } })}
        </div>
        <h3 className="font-bold text-sm text-brand-dark">{label}</h3>
      </div>
      <ChevronRight className="w-5 h-5 text-brand-grey/40" />
    </button>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleUpdate() {
    setError(null);
    if (password.length < 8) return setError("Min 8 characters required");
    if (password !== confirm) return setError("Passwords do not match");

    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      setDone(true);
      setTimeout(onClose, 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center px-4 pb-10">
      <div className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
        
        <div className="flex justify-between items-start mb-6">
           <h2 className="font-heading text-2xl tracking-wide uppercase">Password</h2>
           <button onClick={onClose} className="p-2 bg-brand-sand rounded-full text-brand-grey"><X className="w-5 h-5" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 text-brand-green">
            <CheckCircle className="w-12 h-12 mb-2" />
            <p className="font-bold">Password Updated</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="New Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-4 bg-brand-sand rounded-2xl text-sm font-bold border-none" 
              />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-grey">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirm} 
              onChange={e => setConfirm(e.target.value)} 
              className="w-full p-4 bg-brand-sand rounded-2xl text-sm font-bold border-none" 
            />
            {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
            <button 
              onClick={handleUpdate} 
              disabled={saving || !password} 
              className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}