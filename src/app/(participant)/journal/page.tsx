"use client";
import { useState, useEffect } from "react";
import { Loader2, PenLine, Plus, X, Check, Sparkles, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const WEEK_THEMES = [
  "Foundation & Identity", "Rest & Recovery", "Movement & Momentum", "Nutrition & Fuel",
  "Mental Toughness", "Relationships & Support", "Habits & Routines", "Your Future Self",
];

type Entry = { id: string; week: number; content: string; created_at: string; };

export default function JournalPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("current_week").eq("id", user.id).single();
      setCurrentWeek(profile?.current_week || 1);

      const { data } = await supabase.from("journal_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!content.trim() || !userId) return;
    setSaving(true);
    const { data } = await supabase.from("journal_entries").insert({ user_id: userId, week: currentWeek, content: content.trim() }).select().single();
    if (data) {
      setEntries([data, ...entries]);
      setContent("");
      setShowModal(false);
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
    </div>
  );

  return (
    <main className="min-h-screen bg-brand-sand pb-32 text-brand-dark overflow-x-hidden">
      
      {/* HEADER: Sleek & Dark */}
      <header className="bg-brand-dark text-white pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/20 rounded-full blur-[60px]" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <HomeButton />
             <div>
               <h1 className="font-heading text-3xl tracking-wider leading-none">MY JOURNAL</h1>
               <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">Reflections & Insights</p>
             </div>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-4 space-y-6 relative z-10">
        
        {/* THE PROMPT CARD */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-brand-sand">
           <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-brand-light/10 rounded-2xl flex items-center justify-center shrink-0">
                 <Sparkles className="w-5 h-5 text-brand-light" />
              </div>
              <div>
                 <p className="text-sm font-bold text-brand-dark">Training the Digital Brain</p>
                 <p className="text-xs text-brand-grey leading-relaxed mt-1">
                   Your insights help Coach Strong understand your evolution. Capture what you now know about yourself.
                 </p>
              </div>
           </div>
        </section>

        {/* JOURNAL LIST */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest px-2">Previous Insights</p>
          
          {entries.length === 0 ? (
            <div className="text-center py-12 bg-white/30 rounded-3xl border border-dashed border-brand-grey/20">
              <PenLine className="w-8 h-8 text-brand-grey/30 mx-auto mb-2" />
              <p className="text-xs text-brand-grey font-bold">Your journal is empty.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand relative group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-brand-light uppercase tracking-widest bg-brand-light/5 px-2 py-0.5 rounded-full">
                    Week {entry.week}
                  </span>
                  <span className="text-[9px] text-brand-grey font-bold uppercase">
                    {new Date(entry.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-brand-dark leading-relaxed font-medium">
                  {entry.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-brand-dark text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform z-40 border-4 border-brand-sand"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* WRITE MODAL: Focused & Clean */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-10 sm:pb-0">
          <div className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-heading text-2xl tracking-wide text-brand-dark pt-1">NEW INSIGHT</h2>
                <p className="text-[10px] font-bold text-brand-grey uppercase tracking-widest">Week {currentWeek} • {WEEK_THEMES[currentWeek - 1]}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-brand-sand rounded-full text-brand-grey"><X className="w-5 h-5"/></button>
            </div>

            <p className="text-xs font-bold text-brand-dark mb-3 italic">"What do I now know about myself?"</p>
            
            <textarea
              autoFocus
              className="w-full h-40 p-4 bg-brand-sand rounded-2xl text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-light/20 resize-none mb-6"
              placeholder="Start writing..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Save to Digital Brain
            </button>
          </div>
        </div>
      )}
    </main>
  );
}