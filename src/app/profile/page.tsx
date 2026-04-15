"use client";
import { useState, useRef, useEffect } from "react";
import { Camera, User, Target, Save, Sparkles, Trash2, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export default function EditProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [longTermGoal, setLongTermGoal] = useState("");
  const [goal, setGoal] = useState("");
  const [motivationWord, setMotivationWord] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, preferred_name, long_term_goal, goal, motivation_word")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPreferredName(profile.preferred_name ?? "");
        setLongTermGoal(profile.long_term_goal ?? "");
        setGoal(profile.goal ?? "");
        setMotivationWord(profile.motivation_word ?? "");
      }

      // Load avatar
      const { data } = supabase.storage
        .from("profile_pictures")
        .getPublicUrl(`${user.id}/avatar`);
      try {
        const res = await fetch(data.publicUrl, { method: "HEAD" });
        if (res.ok) setAvatarUrl(data.publicUrl);
      } catch { /* no avatar */ }

      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setAvatarError("Image must be under 2MB.");
      return;
    }

    setAvatarError(null);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const path = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile_pictures").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      setAvatarError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setAvatarError(null);
    setRemoving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: removeError } = await supabase.storage
        .from("profile_pictures")
        .remove([`${user.id}/avatar`]);

      if (removeError) throw removeError;
      setAvatarUrl(null);
    } catch (err: any) {
      setAvatarError(err.message ?? "Could not remove photo.");
    } finally {
      setRemoving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        preferred_name: preferredName.trim(),
        long_term_goal: longTermGoal.trim(),
        goal: goal.trim(),
        motivation_word: motivationWord.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-sand pb-24 font-sans overflow-x-hidden relative text-brand-dark">

      <header className="bg-gradient-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-20 px-6 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(17,12,148,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex justify-between items-start">
          <div>
            <HomeButton />
            <p className="text-brand-green font-bold text-xs uppercase tracking-[0.2em] mb-1 mt-3">
              Account Setup
            </p>
            <h1 className="font-heading text-4xl tracking-wider">PROFILE & GOALS</h1>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-10 space-y-6 relative z-10">

        {/* Avatar Section */}
        <section className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            className="relative mb-2 group cursor-pointer"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div className="w-28 h-28 bg-brand-sand rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden transition-transform group-hover:scale-105">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-brand-grey" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 p-3 bg-brand-light text-white rounded-full shadow-lg border-2 border-white group-hover:bg-brand-mid transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </div>
          </div>

          <p className="text-xs font-bold text-brand-grey uppercase tracking-widest mt-2">
            {uploading ? "Uploading…" : avatarUrl ? "Change Photo" : "Add Photo"}
          </p>

          {avatarUrl && !uploading && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {removing ? "Removing…" : "Remove Photo"}
            </button>
          )}

          {avatarError && (
            <p className="mt-2 text-xs font-bold text-red-500 text-center">{avatarError}</p>
          )}
        </section>

        {/* Personal Details */}
        <section className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white space-y-5">
          <div className="flex items-center gap-3 text-brand-dark mb-2">
            <div className="p-2.5 bg-brand-mid/10 rounded-xl text-brand-mid">
              <User className="w-5 h-5" />
            </div>
            <h2 className="font-heading text-2xl tracking-wide pt-1">PERSONAL DETAILS</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-[0.1em]">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-[0.1em]">Preferred Name</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="What should Coach Strong call you?"
                className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-brand-grey">Leave blank to use your first name.</p>
            </div>
            <div>
              <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-[0.1em]">Email Address</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full bg-brand-sand/60 px-4 py-4 rounded-2xl text-brand-grey font-bold text-sm outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        {/* Goals & Values */}
        <section className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white space-y-5">
          <div className="flex items-center gap-3 text-brand-dark mb-2">
            <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="font-heading text-2xl tracking-wide pt-1">YOUR NORTH STAR</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-[0.1em]">Long Term Goal</label>
              <textarea
                rows={3}
                value={longTermGoal}
                onChange={(e) => setLongTermGoal(e.target.value)}
                placeholder="Where do you want to be in 1–5 years?"
                className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors resize-none leading-relaxed placeholder:text-brand-grey/50 placeholder:font-normal"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-[0.1em]">Current Goal</label>
              <textarea
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What are you focused on right now?"
                className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors resize-none leading-relaxed placeholder:text-brand-grey/50 placeholder:font-normal"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-[0.1em]">Focus Word/s</label>
              <div className="relative">
                <input
                  type="text"
                  value={motivationWord}
                  onChange={(e) => setMotivationWord(e.target.value)}
                  className="w-full bg-brand-sand pl-12 pr-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors"
                />
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-light" />
              </div>
            </div>
          </div>
        </section>

        {saveError && (
          <p className="text-xs font-bold text-red-500 text-center">{saveError}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full text-white font-bold text-sm tracking-widest uppercase py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_20px_rgba(17,12,148,0.2)] active:scale-95 disabled:opacity-70 ${
            saved ? "bg-brand-green" : "bg-brand-dark hover:bg-[#1a15a3]"
          }`}
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="w-5 h-5" /> Saved!</>
          ) : (
            <><Save className="w-5 h-5" /> Save Changes</>
          )}
        </button>

      </div>
    </main>
  );
}
