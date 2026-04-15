"use client";
import { useState } from "react";
import { Target, Pencil, ChevronRight } from "lucide-react";
import WeeklyGoalsModal from "./WeeklyGoalsModal";

type Props = {
  userId: string;
  week: number;
  initialMinGoal: string;
  initialMaxGoal: string;
};

export default function WeeklyGoalsWidget({ userId, week, initialMinGoal, initialMaxGoal }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [minGoal, setMinGoal] = useState(initialMinGoal);
  const [maxGoal, setMaxGoal] = useState(initialMaxGoal);

  const hasGoals = minGoal || maxGoal;

  return (
    <>
      {showModal && (
        <WeeklyGoalsModal
          userId={userId}
          week={week}
          initialMinGoal={minGoal}
          initialMaxGoal={maxGoal}
          onClose={() => setShowModal(false)}
          onSaved={(min, max) => { setMinGoal(min); setMaxGoal(max); }}
        />
      )}

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-mid" />
            <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">WEEK {week} AIMS</h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="p-2 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey hover:text-brand-dark"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {hasGoals ? (
          <div className="space-y-3">
            {minGoal && (
              <div>
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Minimum</p>
                <p className="text-sm font-bold text-brand-dark">{minGoal}</p>
              </div>
            )}
            {maxGoal && (
              <div className={minGoal ? "pt-2 border-t border-brand-sand" : ""}>
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Stretch</p>
                <p className="text-sm text-brand-dark">{maxGoal}</p>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-between p-3 bg-brand-sand rounded-xl text-brand-grey hover:bg-brand-grey/10 transition-colors"
          >
            <span className="text-sm font-bold">Set this week's aims →</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </section>
    </>
  );
}
