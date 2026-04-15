"use client";
import { useState, useEffect } from "react";
import { Loader2, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = typeof DAYS[number];
type DayType = "training" | "meal_prep" | "rest" | "busy" | null;
type Plan = Record<Day, DayType>;

const DAY_LABELS: Record<Day, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  training:  { label: "Training",  bg: "bg-brand-dark",       text: "text-white",      dot: "bg-brand-dark" },
  meal_prep: { label: "Meal Prep", bg: "bg-brand-light",      text: "text-white",      dot: "bg-brand-light" },
  rest:      { label: "Rest",      bg: "bg-brand-green/80",   text: "text-white",      dot: "bg-brand-green" },
  busy:      { label: "Busy",      bg: "bg-brand-grey/40",    text: "text-brand-dark", dot: "bg-brand-grey" },
};

const CYCLE: DayType[] = ["training", "meal_prep", "rest", "busy", null];

function nextType(current: DayType): DayType {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

const EMPTY_PLAN: Plan = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };

export default function PlannerPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_week")
        .eq("id", user.id)
        .single();

      const week = profile?.current_week ?? 0;
      setCurrentWeek(week);

      if (week > 0) {
        const { data: planRow } = await supabase
          .from("weekly_plan")
          .select("plan")
          .eq("user_id", user.id)
          .eq("week", week)
          .maybeSingle();
        if (planRow?.plan) setPlan({ ...EMPTY_PLAN, ...planRow.plan });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleDayTap(day: Day) {
    if (!userId || !currentWeek) return;
    const next = nextType(plan[day]);
    const updated = { ...plan, [day]: next };
    setPlan(updated);
    setSaving(true);
    await supabase.from("weekly_plan").upsert(
      { user_id: userId, week: currentWeek, plan: updated, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week" }
    );
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  if (!currentWeek) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center px-6">
        <p className="text-brand-grey text-sm font-bold text-center">Your program hasn't started yet. Check back on kick-off day.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-sand pb-24 font-sans text-brand-dark">
      <header className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-20 px-6 rounded-b-4xl shadow-[0_10px_30px_rgba(17,12,148,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-mid/30 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <HomeButton />
            <p className="text-brand-light font-bold text-xs uppercase tracking-[0.2em] mb-1 mt-3">Week {currentWeek}</p>
            <h1 className="font-heading text-4xl tracking-wider">MY WEEK PLAN</h1>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-10 space-y-5 relative z-10">

        {/* Legend */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-brand-sand">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-3">Tap a day to cycle through types</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <div key={type} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                {cfg.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-sand text-brand-grey border border-brand-grey/20">
              Unset
            </div>
          </div>
        </section>

        {/* 7-day grid */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-mid" />
              <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">THIS WEEK</h2>
            </div>
            {saving && <Loader2 className="w-4 h-4 animate-spin text-brand-grey" />}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {DAYS.map((day) => {
              const type = plan[day];
              const cfg = type ? TYPE_CONFIG[type] : null;
              return (
                <button
                  key={day}
                  onClick={() => handleDayTap(day)}
                  className={`flex flex-col items-center gap-1 sm:gap-1.5 py-2 sm:py-3 rounded-xl transition-all active:scale-95 ${
                    cfg ? `${cfg.bg} ${cfg.text}` : "bg-brand-sand text-brand-grey"
                  }`}
                >
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide">{DAY_LABELS[day]}</span>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${cfg ? "bg-white/50" : "bg-brand-grey/30"}`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Rule reminder */}
        <div className="px-1">
          <p className="text-xs text-brand-grey text-center leading-relaxed">
            You can shift days, you can shift times — but you can't delete.
          </p>
        </div>

        {/* Summary */}
        {Object.values(plan).some(Boolean) && (
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand space-y-3">
            <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider">Your week at a glance</p>
            {(["training", "meal_prep", "rest", "busy"] as const).map((type) => {
              const days = DAYS.filter(d => plan[d] === type).map(d => DAY_LABELS[d]);
              if (!days.length) return null;
              const cfg = TYPE_CONFIG[type];
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className="text-sm font-bold text-brand-dark">{cfg.label}</span>
                  <span className="text-sm text-brand-grey">{days.join(", ")}</span>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
