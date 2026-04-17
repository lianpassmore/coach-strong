"use client";
import { useState, useEffect } from "react";
import { 
  TrendingUp, CheckCircle, Flame, Activity, Star, 
  Loader2, Target, Sparkles, Pencil, Check, X, 
  ChevronRight, MapPin
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

// Constants (Keep your WEEK_THEMES as is)
const WEEK_THEMES = [
  { week: 1, theme: "Foundation & Identity", short: "Foundation" },
  { week: 2, theme: "Rest & Recovery", short: "Rest" },
  { week: 3, theme: "Movement & Momentum", short: "Movement" },
  { week: 4, theme: "Nutrition & Fuel", short: "Nutrition" },
  { week: 5, theme: "Mental Toughness", short: "Mental" },
  { week: 6, theme: "Relationships & Support", short: "Support" },
  { week: 7, theme: "Habits & Routines", short: "Habits" },
  { week: 8, theme: "Your Future Self", short: "Future" },
];

export default function JourneyPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [energyStats, setEnergyStats] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editGoal, setEditGoal] = useState("");
  const [editWord, setEditWord] = useState("");

  useEffect(() => {
    async function loadJourney() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: checkins } = await supabase.from("check_ins").select("week, energy_level, assignment_completed").eq("user_id", user.id);

      setProfile(prof);
      setEditGoal(prof?.goal || "");
      setEditWord(prof?.motivation_word || "");

      // Process Energy Data (Simplified for the chart)
      const effectiveWeek = prof?.is_admin ? 8 : (prof?.current_week || 1);
      const weeklyData = WEEK_THEMES.slice(0, effectiveWeek).map(w => {
        const weekCheckins = checkins?.filter(c => c.week === w.week) || [];
        const avg = weekCheckins.length ? weekCheckins.reduce((acc, curr) => acc + (curr.energy_level || 0), 0) / weekCheckins.length : 0;
        return { ...w, avg, completed: weekCheckins.some(c => c.assignment_completed) };
      });
      
      setEnergyStats(weeklyData);
      setLoading(false);
    }
    loadJourney();
  }, []);

  async function handleSave() {
    await supabase.from("profiles").update({ goal: editGoal, motivation_word: editWord }).eq("id", profile.id);
    setProfile({ ...profile, goal: editGoal, motivation_word: editWord });
    setEditing(false);
  }

  if (loading) return <div className="min-h-screen bg-brand-sand flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>;

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-brand-dark text-white pt-12 pb-10 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <HomeButton />
            <div>
               <h1 className="font-heading text-3xl tracking-wider leading-none">THE JOURNEY</h1>
               <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">
                 Week {profile?.current_week} • Evolution in Progress
               </p>
            </div>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10">

        {/* PILLAR 1: NORTH STAR (Identity) */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-sand">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-light" />
              <h2 className="font-heading text-xl tracking-wide pt-1">MY NORTH STAR</h2>
            </div>
            <button onClick={() => setEditing(!editing)} className="text-brand-grey"><Pencil className="w-4 h-4" /></button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <textarea 
                className="w-full p-4 bg-brand-sand rounded-xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light"
                value={editGoal} onChange={(e) => setEditGoal(e.target.value)}
              />
              <input 
                className="w-full p-4 bg-brand-sand rounded-xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light"
                value={editWord} onChange={(e) => setEditWord(e.target.value)}
              />
              <button onClick={handleSave} className="w-full py-3 bg-brand-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest">Update Identity</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-bold text-brand-dark leading-relaxed">"{profile?.goal}"</p>
              <div className="flex items-center gap-2 pt-3 border-t border-brand-sand">
                <Sparkles className="w-4 h-4 text-brand-mid" />
                <span className="font-heading text-xl tracking-widest text-brand-mid">{profile?.motivation_word?.toUpperCase()}</span>
              </div>
            </div>
          )}
        </section>

        {/* PILLAR 2: ENERGY DATA */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-sand">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-brand-light" />
            <h2 className="font-heading text-xl tracking-wide pt-1">ENERGY LEVELS</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-8">
            <StatBox label="Average" value="4.2" icon={<Activity />} />
            <StatBox label="Peak" value="Wk 3" icon={<Star />} />
            <StatBox label="Trend" value="Up" icon={<TrendingUp />} />
          </div>

          <div className="h-32 w-full flex items-end justify-between gap-2 px-2">
             {energyStats.map((w, i) => (
               <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-brand-light/20 rounded-t-lg relative group transition-all"
                    style={{ height: `${(w.avg / 5) * 100}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {w.avg.toFixed(1)}
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-brand-grey uppercase">{w.short}</span>
               </div>
             ))}
          </div>
        </section>

        {/* PILLAR 3: MILESTONES (The Timeline) */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-sand">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-5 h-5 text-brand-light" />
            <h2 className="font-heading text-xl tracking-wide pt-1">MILESTONES</h2>
          </div>

          <div className="space-y-0 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-brand-sand" />
            
            {WEEK_THEMES.map((w, i) => {
              const isActive = w.week <= (profile?.current_week || 0);
              const isCompleted = energyStats.find(s => s.week === w.week)?.completed;

              return (
                <div key={i} className={`flex items-start gap-4 pb-8 relative ${!isActive ? 'opacity-30' : ''}`}>
                  <div className={`w-8 h-8 rounded-full z-10 flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${
                    isCompleted ? 'bg-brand-green text-white' : 'bg-brand-sand text-brand-grey'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-[10px] font-bold">{w.week}</span>}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-bold ${isActive ? 'text-brand-dark' : 'text-brand-grey'}`}>
                      {w.theme}
                    </p>
                    {isActive && (
                      <p className="text-[10px] text-brand-grey font-medium mt-0.5">
                        {isCompleted ? "Milestone Unlocked" : "Current Focus"}
                      </p>
                    )}
                  </div>
                  {isActive && !isCompleted && <MapPin className="w-4 h-4 text-brand-light animate-bounce" />}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}

// Helper Components
function StatBox({ label, value, icon }: any) {
  return (
    <div className="bg-brand-sand/50 p-3 rounded-2xl text-center border border-brand-dark/5">
      <p className="text-[8px] font-black text-brand-grey uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-black text-brand-dark leading-none">{value}</p>
    </div>
  );
}