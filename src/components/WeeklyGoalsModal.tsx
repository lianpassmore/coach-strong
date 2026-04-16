"use client";
import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  week: number;
  initialMinGoal: string;
  initialMaxGoal: string;
  onClose: () => void;
  onSaved: (min: string, max: string) => void;
};

export default function WeeklyGoalsModal({ userId, week, initialMinGoal, initialMaxGoal, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [minGoal, setMinGoal] = useState(initialMinGoal);
  const [maxGoal, setMaxGoal] = useState(initialMaxGoal);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase.from("weekly_goals").upsert(
      { user_id: userId, week, min_goal: minGoal.trim(), max_goal: maxGoal.trim(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,week" }
    );
    setSaving(false);
    setDone(true);
    onSaved(minGoal.trim(), maxGoal.trim());
    setTimeout(onClose, 800);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl tracking-wide text-brand-dark">WEEK {week} GOALS</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-sand transition-colors">
            <X className="w-5 h-5 text-brand-grey" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-brand-green" />
            </div>
            <p className="font-bold text-brand-dark text-center">Goals saved!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-2">
                  Minimum aim
                </label>
                <textarea
                  value={minGoal}
                  onChange={(e) => setMinGoal(e.target.value)}
                  placeholder="e.g. 2 walks + protein at every meal"
                  rows={2}
                  className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-2">
                  Optimal aim
                </label>
                <textarea
                  value={maxGoal}
                  onChange={(e) => setMaxGoal(e.target.value)}
                  placeholder="e.g. 4 training sessions + meal prep Sunday"
                  rows={2}
                  className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || (!minGoal.trim() && !maxGoal.trim())}
              className="w-full py-3.5 bg-brand-dark text-white font-bold text-sm rounded-2xl hover:bg-brand-mid transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Goals"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
