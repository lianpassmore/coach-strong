"use client";
import { useState } from "react";
import { Sun, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  currentWeek: number;
  todayDate: string;
  initialIntention: string | null;
};

export default function MorningIntentionCard({ userId, currentWeek, todayDate, initialIntention }: Props) {
  const supabase = createClient();

  // Only show between midnight and noon NZ time
  const hourNZ = parseInt(
    new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", hour12: false })
  );
  const isMorning = hourNZ >= 0 && hourNZ < 12;

  const [intention, setIntention] = useState(initialIntention ?? "");
  const [saved, setSaved] = useState(!!initialIntention);
  const [saving, setSaving] = useState(false);

  if (!isMorning && !saved) return null;

  async function handleSave() {
    if (!intention.trim()) return;
    setSaving(true);
    await supabase.from("check_ins").upsert(
      { user_id: userId, checked_in_date: todayDate, week: currentWeek, morning_intention: intention.trim() },
      { onConflict: "user_id,checked_in_date" }
    );
    setSaving(false);
    setSaved(true);
  }

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-4 h-4 text-brand-light" />
        <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">MORNING INTENTION</h2>
      </div>

      {saved ? (
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-brand-green/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-brand-green" />
          </div>
          <p className="text-sm font-bold text-brand-dark">{intention}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider">What's the plan today?</p>
          <input
            type="text"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="e.g. Train at 6am, prep lunch, early night"
            className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={!intention.trim() || saving}
            className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Set intention"}
          </button>
        </div>
      )}
    </section>
  );
}
