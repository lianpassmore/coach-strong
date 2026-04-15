"use client";
import { useState, useRef, useEffect } from "react";
import { Camera, User, Target, Save, Sparkles, Trash2, Loader2, Check, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export default function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile States
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [longTermGoal, setLongTermGoal] = useState("");
  const [goal, setGoal] = useState("");
  const [motivationWord, setMotivationWord] = useState("");

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile) {
        setFullName(profile.full_name ?? "");
        setPreferredName(profile.preferred_name ?? "");
        setLongTermGoal(profile.long_term_goal ?? "");
        setGoal(profile.goal ?? "");
        setMotivationWord(profile.motivation_word ?? "");
      }

      const { data } = supabase.storage.from("profile_pictures").getPublicUrl(`${user.id}/avatar`);
      try {
        const res = await fetch(data.publicUrl, { method: "HEAD" });
        if (res.ok) setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      } catch { /* no avatar */ }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ALLOWED_TYPES.includes(file.type)) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.storage.from("profile_pictures").upload(`${user.id}/avatar`, file, { upsert: true });
      const { data } = supabase.storage.from("profile_pictures").getPublicUrl(`${user.id}/avatar`);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        preferred_name: preferredName.trim(),
        long_term_goal: longTermGoal.trim(),
        goal: goal.trim(),
        motivation_word: motivationWord.trim(),
        updated_at: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen bg-brand-sand flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>;

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden">
      
      {/* HEADER HERO */}
      <header className="bg-brand-dark text-white pt-12 pb-16 px-6 rounded-b-[3rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex justify-between items-start mb-8">
           <HomeButton />
           <AppMenu />
        </div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="relative group" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 bg-brand-sand rounded-[2rem] flex items-center justify-center border-4 border-white/10 overflow-hidden shadow-2xl">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-brand-grey" />}
              </div>
              <div className="absolute -bottom-2 -right-2 p-2.5 bg-brand-light text-white rounded-xl shadow-lg border-2 border-brand-dark group-active:scale-90 transition-transform">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={onUpload} />
            </div>
            
            <h1 className="mt-4 font-heading text-3xl tracking-wide uppercase">{preferredName || fullName || 'My Identity'}</h1>
            <div className="flex items-center gap-1.5 opacity-50 mt-1">
               <Mail className="w-3 h-3" />
               <p className="text-[10px] font-bold uppercase tracking-widest">{email}</p>
            </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-8 space-y-6 relative z-10">
        
        {/* SECTION: COACHING CALIBRATION */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-brand-sand">
           <div className="flex items-center gap-2 mb-6 px-1">
              <Target className="w-5 h-5 text-brand-light" />
              <h2 className="font-heading text-xl tracking-wide pt-1">COACHING CALIBRATION</h2>
           </div>

           <div className="space-y-5">
              <Input label="Preferred Name" value={preferredName} onChange={setPreferredName} placeholder="What should Coach call you?" />
              <Input label="Full Name" value={fullName} onChange={setFullName} placeholder="Legal name" />
              
              <div className="pt-4 border-t border-brand-sand space-y-5">
                <TextArea 
                  label="8-Week Focus" 
                  value={goal} 
                  onChange={setGoal} 
                  placeholder="What is the one thing we are solving for right now?" 
                />
                
                <div className="relative">
                   <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest mb-2 px-1">Focus Word</p>
                   <div className="relative">
                      <input 
                        className="w-full pl-12 pr-4 py-4 bg-brand-sand rounded-2xl text-sm font-bold border-none"
                        value={motivationWord}
                        onChange={(e) => setMotivationWord(e.target.value)}
                        placeholder="e.g. Consistency"
                      />
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-light" />
                   </div>
                </div>

                <TextArea 
                  label="The North Star (1-5 Years)" 
                  value={longTermGoal} 
                  onChange={setLongTermGoal} 
                  placeholder="Where are we heading in the long run?" 
                />
              </div>
           </div>
        </section>

        {/* SAVE ACTION */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-5 rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
            saved ? "bg-brand-green text-brand-dark" : "bg-brand-dark text-white"
          }`}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5 text-brand-light" />}
          {saved ? "Profile Updated" : "Save Calibration"}
        </button>

      </div>
    </main>
  );
}

// Sub-components
function Input({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest mb-2 px-1">{label}</p>
      <input 
        className="w-full px-5 py-4 bg-brand-sand rounded-2xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light transition-all"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest mb-2 px-1">{label}</p>
      <textarea 
        className="w-full h-28 px-5 py-4 bg-brand-sand rounded-2xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light resize-none leading-relaxed"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      />
    </div>
  );
}