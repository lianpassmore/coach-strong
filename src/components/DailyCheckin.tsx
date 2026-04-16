"use client";
import { useState } from "react";
import { Battery, Check, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  currentWeek: number;
  todayDate: string;
  hasWeeklyGoal: boolean;
  initialEnergy: number | null;
  initialTaskDone: boolean;
  initialWentWell: string | null;
  initialMorningIntention: string | null;
};

export default function DailyCheckin({
  userId,
  currentWeek,
  todayDate,
  hasWeeklyGoal,
  initialEnergy,
  initialTaskDone,
  initialWentWell,
  initialMorningIntention,
}: Props) {
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(() => {
    // Start collapsed/complete if already fully checked in
    if (initialEnergy && initialWentWell) return 3;
    if (initialEnergy) return 2;
    return 1;
  });
  const [expanded, setExpanded] = useState(false);

  const [wentWell, setWentWell] = useState(initialWentWell ?? "");
  const [energy, setEnergy] = useState<number | null>(initialEnergy);
  const [isTaskDone, setIsTaskDone] = useState(initialTaskDone);
  const [minGoalReflection, setMinGoalReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Suppress unused warning — stored via morning intention card separately
  void initialMorningIntention;

  async function upsert(updates: Record<string, unknown>) {
    setSaving(true);
    await supabase.from("check_ins").upsert(
      { user_id: userId, checked_in_date: todayDate, week: currentWeek, ...updates },
      { onConflict: "user_id,checked_in_date" }
    );
    setSaving(false);
  }

  async function handleStep1Next() {
    if (!wentWell.trim()) return;
    await upsert({ went_well: wentWell.trim() });
    setStep(2);
  }

  async function handleEnergySelect(level: number) {
    setEnergy(level);
    await upsert({ energy_level: level });
  }

  async function handleTaskToggle() {
    const next = !isTaskDone;
    setIsTaskDone(next);
    await upsert({ assignment_completed: next });
  }

  async function handleDone() {
    if (minGoalReflection.trim()) {
      await upsert({ min_goal_reflection: minGoalReflection.trim() });
    }
    setSaved(true);
    setExpanded(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleStep2Next() {
    if (!energy) return;
    if (hasWeeklyGoal) {
      setStep(3);
    } else {
      setSaved(true);
      setExpanded(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  // Collapsed summary
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-white px-5 py-3 rounded-2xl shadow-sm border border-brand-sand flex items-center gap-3 transition-all active:scale-[0.98]"
      >
        <div className="w-7 h-7 bg-brand-green/10 rounded-full flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-brand-green" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider">Daily Check-In</p>
          <p className="text-sm font-bold text-brand-dark">
            {energy ? `Energy ${energy}/5` : "Tap to check in"}
            {wentWell ? " · Win logged ✓" : ""}
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-brand-grey shrink-0" />}
        {saved && <Check className="w-4 h-4 text-brand-green shrink-0" />}
      </button>
    );
  }

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-brand-dark">
          <Battery className="w-4 h-4 text-brand-mid" />
          <h2 className="font-heading text-xl tracking-wide pt-1">DAILY CHECK-IN</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Step indicators */}
          <div className="flex gap-1">
            {[1, 2, hasWeeklyGoal ? 3 : null].filter(Boolean).map((s) => (
              <div
                key={s}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  step >= (s as number) ? "bg-brand-mid" : "bg-brand-sand"
                }`}
              />
            ))}
          </div>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-brand-grey" />}
          {!saving && saved && <Check className="w-4 h-4 text-brand-green" />}
        </div>
      </div>

      {/* Step 1: One thing that went well */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black text-brand-grey mb-2 uppercase tracking-wider">
              One thing that went well today
            </p>
            <textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="Even small wins count…"
              rows={3}
              className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
            />
          </div>
          <button
            onClick={handleStep1Next}
            disabled={!wentWell.trim() || saving}
            className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Energy + Assignment */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black text-brand-grey mb-3 uppercase tracking-wider">Energy Level</p>
            <div className="flex justify-between gap-2 max-w-sm mx-auto">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => handleEnergySelect(level)}
                  className={`w-11 h-11 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                    energy === level
                      ? "bg-brand-mid text-white shadow-md scale-110"
                      : "bg-brand-sand text-brand-grey hover:bg-brand-grey/20"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-brand-sand">
            <button
              onClick={handleTaskToggle}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isTaskDone
                  ? "border-brand-green bg-brand-green/5"
                  : "border-brand-sand bg-white hover:border-brand-light/30"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                isTaskDone ? "bg-brand-green text-white" : "border-2 border-brand-sand text-transparent"
              }`}>
                <Check className="w-3 h-3" />
              </div>
              <span className={`text-sm font-bold text-left ${isTaskDone ? "text-brand-dark" : "text-brand-grey"}`}>
                Week {currentWeek} assignment completed
              </span>
            </button>
          </div>

          <button
            onClick={handleStep2Next}
            disabled={!energy || saving}
            className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {hasWeeklyGoal ? (
              <>Next <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Done <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Min goal reflection (only if weekly goal exists) */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black text-brand-grey mb-2 uppercase tracking-wider">
              How did you go against your minimum goal?
            </p>
            <textarea
              value={minGoalReflection}
              onChange={(e) => setMinGoalReflection(e.target.value)}
              placeholder="Optional — what happened?"
              rows={3}
              className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
            />
          </div>
          <button
            onClick={handleDone}
            disabled={saving}
            className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            Done <Check className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
