"use client";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = typeof DAYS[number];
type DayType = "training" | "meal_prep" | "rest" | "busy" | null;

const DOT_COLOR: Record<string, string> = {
  training:  "bg-brand-dark",
  meal_prep: "bg-brand-light",
  rest:      "bg-brand-green",
  busy:      "bg-brand-grey/50",
};

const DAY_LABELS: Record<Day, string> = {
  mon: "M", tue: "T", wed: "W", thu: "T", fri: "F", sat: "S", sun: "S",
};

type Props = {
  plan: Record<string, DayType>;
  week: number;
};

export default function PlannerStrip({ plan, week }: Props) {
  const hasAnyDay = DAYS.some(d => plan[d]);

  return (
    <Link
      href="/planner"
      className="w-full bg-white px-5 py-3 rounded-2xl shadow-sm border border-brand-sand flex items-center gap-3 transition-all active:scale-[0.98]"
    >
      <CalendarDays className="w-4 h-4 text-brand-mid shrink-0" />
      <div className="flex-1">
        <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1.5">Week {week} plan</p>
        <div className="flex gap-1.5 items-center">
          {DAYS.map((day) => {
            const type = plan[day];
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  type ? DOT_COLOR[type] : "bg-brand-sand"
                }`}>
                  {!type && <span className="text-[8px] font-black text-brand-grey/50">{DAY_LABELS[day]}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!hasAnyDay && (
        <span className="text-xs font-bold text-brand-grey shrink-0">Plan →</span>
      )}
    </Link>
  );
}
