"use client";
import { useState } from "react";
import { Moon, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  lastPeriodStart: string | null; // ISO date string e.g. "2026-03-01"
};

function getCycleDay(periodStart: string | null): number | null {
  if (!periodStart) return null;
  const start = new Date(periodStart);
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" }));
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return diff + 1;
}

export default function CycleTracker({ userId, lastPeriodStart }: Props) {
  const supabase = createClient();

  const [periodStart, setPeriodStart] = useState(lastPeriodStart);
  const [logging, setLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const cycleDay = getCycleDay(periodStart);
  const todayNZ = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
  const alreadyLoggedToday = periodStart === todayNZ;

  async function logDay1() {
    setLogging(true);
    await supabase.from("cycle_logs").insert({ user_id: userId, period_start: todayNZ });
    setPeriodStart(todayNZ);
    setLogging(false);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  }

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="w-4 h-4 text-brand-mid" />
        <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">CYCLE TRACKER</h2>
      </div>

      {cycleDay !== null ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-mid/10 flex items-center justify-center shrink-0">
              <span className="font-heading text-xl text-brand-mid">{cycleDay}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider">Current cycle day</p>
              <p className="text-sm font-bold text-brand-dark">
                {cycleDay <= 5 ? "Menstruation phase" :
                 cycleDay <= 13 ? "Follicular phase" :
                 cycleDay <= 16 ? "Ovulation phase" :
                 "Luteal phase"}
              </p>
            </div>
          </div>

          {!alreadyLoggedToday && (
            <button
              onClick={logDay1}
              disabled={logging}
              className="w-full py-2.5 bg-brand-sand text-brand-dark font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-brand-grey/20 transition-colors"
            >
              {logging ? <Loader2 className="w-4 h-4 animate-spin" /> :
               justLogged ? <Check className="w-4 h-4 text-brand-green" /> :
               <Moon className="w-4 h-4" />}
              {justLogged ? "Day 1 logged!" : "Log today as Day 1"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-brand-grey leading-relaxed">
            Log your period start to track your cycle. Coach Strong will use this to support you through each phase.
          </p>
          <button
            onClick={logDay1}
            disabled={logging}
            className="w-full py-2.5 bg-brand-dark text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2"
          >
            {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4" />}
            {logging ? "Saving…" : "Log today as Day 1"}
          </button>
        </div>
      )}
    </section>
  );
}
