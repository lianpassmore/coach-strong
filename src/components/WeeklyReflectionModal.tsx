"use client";
import { useState } from "react";
import { X, Check, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  week: number;
  onClose: () => void;
  onSaved: () => void;
};

const QUESTIONS = [
  { key: "went_well", label: "What went well this week?", placeholder: "Any wins, big or small…" },
  { key: "challenging", label: "What was challenging?", placeholder: "Honest reflection here…" },
  { key: "do_differently", label: "Knowing this, what will you do differently?", placeholder: "One change for next week…" },
] as const;

export default function WeeklyReflectionModal({ userId, week, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ went_well: "", challenging: "", do_differently: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  async function handleNext() {
    if (!answers[current.key].trim()) return;
    if (isLast) {
      setSaving(true);
      await supabase.from("weekly_reflections").upsert(
        { user_id: userId, week, ...answers, updated_at: new Date().toISOString() },
        { onConflict: "user_id,week" }
      );
      setSaving(false);
      setDone(true);
      onSaved();
      setTimeout(onClose, 1200);
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-0.5">
              Week {week} reflection · {step + 1} of {QUESTIONS.length}
            </p>
            <h2 className="font-heading text-2xl tracking-wide text-brand-dark">REFLECT</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-sand transition-colors">
            <X className="w-5 h-5 text-brand-grey" />
          </button>
        </div>

        {/* Step progress dots */}
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-colors ${i <= step ? "bg-brand-mid" : "bg-brand-sand"}`}
            />
          ))}
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-brand-green" />
            </div>
            <p className="font-bold text-brand-dark text-center">Reflection saved!</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-2">
                {current.label}
              </label>
              <textarea
                value={answers[current.key]}
                onChange={(e) => setAnswers((a) => ({ ...a, [current.key]: e.target.value }))}
                placeholder={current.placeholder}
                rows={4}
                className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
                autoFocus
              />
            </div>

            <button
              onClick={handleNext}
              disabled={!answers[current.key].trim() || saving}
              className="w-full py-3.5 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLast ? (saving ? "Saving…" : <>Save reflection <Check className="w-4 h-4" /></>) : <>Next <ChevronRight className="w-4 h-4" /></>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
