"use client";
import { useState, useEffect } from "react";
import { Loader2, CalendarDays, Info, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = typeof DAYS[number];
type DayType = "training" | "meal_prep" | "rest" | "busy";
type Plan = Record<Day, DayType[]>;

const DAY_LABELS: Record<Day, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

const TYPE_CONFIG: Record<DayType, { label: string; bg: string; text: string; activeBg: string }> = {
  training:  { label: "Training",  bg: "bg-brand-sand",       text: "text-brand-grey",  activeBg: "bg-brand-dark text-white" },
  meal_prep: { label: "Meal Prep", bg: "bg-brand-sand",       text: "text-brand-grey",  activeBg: "bg-brand-light text-white" },
  rest:      { label: "Rest",      bg: "bg-brand-sand",       text: "text-brand-grey",  activeBg: "bg-brand-green text-brand-dark" },
  busy:      { label: "Busy",      bg: "bg-brand-sand",       text: "text-brand-grey",  activeBg: "bg-brand-grey/30 text-brand-dark" },
};

const ALL_TYPES: DayType[] = ["training", "meal_prep", "rest", "busy"];

const EMPTY_PLAN: Plan = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export default function PlannerPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("current_week").eq("id", user.id).single();
      const week = profile?.current_week ?? 1;
      setCurrentWeek(week);

      const { data: planRow } = await supabase.from("weekly_plan").select("plan").eq("user_id", user.id).eq("week", week).maybeSingle();
      if (planRow?.plan) {
        // Migrate legacy single-value format to arrays
        const raw = planRow.plan as Record<string, unknown>;
        const migrated: Plan = { ...EMPTY_PLAN };
        for (const day of DAYS) {
          const val = raw[day];
          if (Array.isArray(val)) migrated[day] = val as DayType[];
          else if (val && typeof val === "string") migrated[day] = [val as DayType];
          else migrated[day] = [];
        }
        setPlan(migrated);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle(day: Day, type: DayType) {
    if (!userId) return;
    const current = plan[day];
    const updated: Plan = {
      ...plan,
      [day]: current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    };

    setPlan(updated);
    setSaving(true);
    await supabase.from("weekly_plan").upsert({
      user_id: userId,
      week: currentWeek,
      plan: updated,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,week" });
    setSaving(false);
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
               <h1 className="font-heading text-3xl tracking-wider leading-none">WEEK PLANNER</h1>
               <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">
                 Week {currentWeek} • The Battle Plan
               </p>
            </div>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10">

        {/* COACHING PRINCIPLE CARD */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-brand-sand">
           <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-brand-dark rounded-2xl flex items-center justify-center shrink-0">
                 <Info className="w-5 h-5 text-brand-green" />
              </div>
              <div>
                 <p className="text-sm font-bold text-brand-dark">Shift, Don&apos;t Delete</p>
                 <p className="text-xs text-brand-grey leading-relaxed mt-1">
                   Life happens. You can move your training to a different day, but you cannot delete the intent.
                 </p>
              </div>
           </div>
        </section>

        {/* 7-DAY BATTLE PLAN */}
        <section className="bg-white p-6 rounded-4xl shadow-sm border border-brand-sand">
          <div className="flex justify-between items-center mb-6 px-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-light" />
              <h2 className="font-heading text-xl tracking-wide pt-1">THIS WEEK</h2>
            </div>
            {saving && <Clock className="w-4 h-4 animate-pulse text-brand-light" />}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {DAYS.map((day) => {
              const selected = plan[day];
              return (
                <div key={day} className="flex items-center gap-3 px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-brand-dark w-8 shrink-0">
                    {DAY_LABELS[day]}
                  </span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {ALL_TYPES.map((type) => {
                      const active = selected.includes(type);
                      const cfg = TYPE_CONFIG[type];
                      return (
                        <button
                          key={type}
                          onClick={() => handleToggle(day, type)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${
                            active
                              ? `${cfg.activeBg} border-transparent`
                              : `${cfg.bg} ${cfg.text} border-brand-dark/10`
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI INTEGRATION NOTE */}
        <p className="text-[10px] text-brand-grey font-medium text-center px-8 leading-relaxed italic">
          Coach Strong adapts her check-ins based on your plan. If it&apos;s a rest day, she knows.
        </p>

      </div>
    </main>
  );
}
