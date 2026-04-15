"use client";
import { useState } from "react";
import { BookOpen, Check } from "lucide-react";
import WeeklyReflectionModal from "./WeeklyReflectionModal";

type Props = {
  userId: string;
  week: number;
  hasReflection: boolean;
};

export default function WeeklyReflectionCard({ userId, week, hasReflection: initialHasReflection }: Props) {
  // Only show on Friday (5) or Saturday (6) NZ time
  const dayNZ = new Date().toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long" });
  const isFriOrSat = dayNZ === "Friday" || dayNZ === "Saturday";

  const [showModal, setShowModal] = useState(false);
  const [hasReflection, setHasReflection] = useState(initialHasReflection);

  if (!isFriOrSat && !hasReflection) return null;
  if (hasReflection) {
    return (
      <div className="w-full bg-white px-5 py-3 rounded-2xl shadow-sm border border-brand-sand flex items-center gap-3">
        <div className="w-7 h-7 bg-brand-green/10 rounded-full flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-brand-green" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider">Week {week} reflection</p>
          <p className="text-sm font-bold text-brand-dark">Saved ✓</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <WeeklyReflectionModal
          userId={userId}
          week={week}
          onClose={() => setShowModal(false)}
          onSaved={() => setHasReflection(true)}
        />
      )}

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-brand-mid" />
          <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">END OF WEEK</h2>
        </div>
        <p className="text-sm text-brand-grey mb-4 leading-relaxed">
          Take 2 minutes to reflect on your week. The participants who did this had the biggest breakthroughs.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Reflect on Week {week}
        </button>
      </section>
    </>
  );
}
