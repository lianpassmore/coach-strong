"use client";
import { useState, useEffect } from "react";
import { 
  TrendingUp, CheckCircle, Flame, Activity, Star, 
  Loader2, Sparkles, Check, ChevronRight, BarChart3
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const WEEK_THEMES = [
  { week: 1, theme: "Foundation", short: "W1" },
  { week: 2, theme: "Rest & Recovery", short: "W2" },
  { week: 3, theme: "Movement", short: "W3" },
  { week: 4, theme: "Nutrition", short: "W4" },
  { week: 5, theme: "Toughness", short: "W5" },
  { week: 6, theme: "Support", short: "W6" },
  { week: 7, theme: "Habits", short: "W7" },
  { week: 8, theme: "Future Self", short: "W8" },
];

export default function ProgressPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [energyStats, setEnergyStats] = useState<any[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: checkins }] = await Promise.all([
        supabase.from("profiles").select("current_week, is_admin").eq("id", user.id).single(),
        supabase.from("check_ins").select("week, energy_level, assignment_completed").eq("user_id", user.id),
      ]);

      const week = profile?.is_admin ? 8 : (profile?.current_week ?? 1);
      setCurrentWeek(week);

      // Process Energy Stats
      const processedEnergy = WEEK_THEMES.slice(0, week).map(t => {
        const weekRows = checkins?.filter(c => c.week === t.week && c.energy_level !== null) || [];
        const avg = weekRows.length ? weekRows.reduce((acc, curr) => acc + (curr.energy_level || 0), 0) / weekRows.length : 0;
        return { ...t, avg };
      });
      setEnergyStats(processedEnergy);

      // Process Assignments
      const processedAssignments = WEEK_THEMES.slice(0, week).map(t => ({
        ...t,
        completed: checkins?.some(c => c.week === t.week && c.assignment_completed)
      }));
      setAssignmentStats(processedAssignments);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
    </div>
  );

  const avgEnergy = energyStats.length > 0 ? (energyStats.reduce((s, d) => s + d.avg, 0) / energyStats.length).toFixed(1) : "0";
  const completedCount = assignmentStats.filter(a => a.completed).length;

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-brand-dark text-white pt-12 pb-10 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <HomeButton />
            <div>
               <h1 className="font-heading text-3xl tracking-wider leading-none">PROGRESS</h1>
               <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">
                 8-Week Evolution Map
               </p>
            </div>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10">

        {/* TOP STATS GRID */}
        <div className="grid grid-cols-3 gap-3">
           <StatTile label="Avg Energy" value={avgEnergy} icon={<Activity className="text-brand-light" />} />
           <StatTile label="Unlocked" value={`${completedCount}/8`} icon={<Star className="text-amber-400" />} />
           <StatTile label="Current" value={`Wk ${currentWeek}`} icon={<Flame className="text-orange-400" />} />
        </div>

        {/* ENERGY VISUALIZER */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-sand">
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="w-5 h-5 text-brand-light" />
            <h2 className="font-heading text-xl tracking-wide pt-1 uppercase">Energy Trends</h2>
          </div>

          <div className="h-32 flex items-end justify-between gap-2 px-2">
            {energyStats.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-brand-dark rounded-t-lg transition-all duration-500 ease-out"
                  style={{ height: `${(w.avg / 5) * 100}%` }}
                />
                <span className="text-[8px] font-black text-brand-grey uppercase">{w.short}</span>
              </div>
            ))}
          </div>
        </section>

        {/* MILESTONE LIST */}
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-sand">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-5 h-5 text-brand-light" />
            <h2 className="font-heading text-xl tracking-wide pt-1 uppercase">Program Milestones</h2>
          </div>

          <div className="space-y-3">
            {assignmentStats.map((item, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  item.completed 
                    ? "bg-brand-green/10 border-brand-green/20" 
                    : "bg-brand-sand/50 border-transparent opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.completed ? "bg-brand-green text-white" : "bg-brand-grey/20 text-brand-grey"
                  }`}>
                    {item.completed ? <Check className="w-4 h-4" /> : item.week}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-dark">{item.theme}</p>
                    <p className="text-[9px] font-black text-brand-grey uppercase tracking-widest">
                      {item.completed ? "Achieved" : "Pending"}
                    </p>
                  </div>
                </div>
                {item.week === currentWeek && !item.completed && (
                  <Sparkles className="w-4 h-4 text-brand-light animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* AI INSIGHT FOOTER */}
        <div className="bg-brand-dark p-6 rounded-[2rem] text-white overflow-hidden relative">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-light/10 rounded-full blur-2xl" />
           <div className="flex gap-4 items-start relative z-10">
              <div className="w-10 h-10 bg-brand-light/20 rounded-xl flex items-center justify-center shrink-0">
                 <TrendingUp className="w-5 h-5 text-brand-light" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">Coach Insight</p>
                 <p className="text-xs leading-relaxed opacity-90">
                    Based on your energy trends, you are strongest in the mornings during {WEEK_THEMES[currentWeek - 1].theme} phases. Talk to Coach Strong if you feel a dip.
                 </p>
              </div>
           </div>
        </div>

      </div>
    </main>
  );
}

function StatTile({ label, value, icon }: any) {
  return (
    <div className="bg-white p-4 rounded-[1.5rem] text-center shadow-sm border border-brand-sand flex flex-col items-center">
      <div className="mb-2 opacity-80">{icon}</div>
      <p className="text-lg font-black text-brand-dark leading-none">{value}</p>
      <p className="text-[8px] font-black text-brand-grey uppercase tracking-widest mt-1.5">{label}</p>
    </div>
  );
}