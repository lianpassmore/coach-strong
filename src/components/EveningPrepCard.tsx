"use client";
import { useState } from "react";
import { Moon, Check, X } from "lucide-react";

const PREP_ITEMS = [
  "Breakfast sorted",
  "Lunch ready",
  "Training gear out",
  "Water bottle filled",
];

export default function EveningPrepCard() {
  // Only show between 6pm and 10pm NZ time
  const hourNZ = parseInt(
    new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", hour12: false })
  );
  const isEvening = hourNZ >= 18 && hourNZ < 22;

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  if (!isEvening || dismissed) return null;

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const allDone = checked.size === PREP_ITEMS.length;

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-brand-mid" />
          <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">SORT TOMORROW TONIGHT</h2>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-brand-grey mb-4">30 seconds now saves the whole morning.</p>

      <div className="space-y-2">
        {PREP_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
              checked.has(i)
                ? "border-brand-green bg-brand-green/5"
                : "border-brand-sand bg-white hover:border-brand-light/30"
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              checked.has(i) ? "bg-brand-green text-white" : "border-2 border-brand-sand"
            }`}>
              {checked.has(i) && <Check className="w-3 h-3" />}
            </div>
            <span className={`text-sm font-bold text-left ${checked.has(i) ? "text-brand-dark" : "text-brand-grey"}`}>
              {item}
            </span>
          </button>
        ))}
      </div>

      {allDone && (
        <div className="mt-4 p-3 bg-brand-green/10 rounded-xl text-center">
          <p className="text-sm font-bold text-brand-green">You're set for tomorrow!</p>
        </div>
      )}
    </section>
  );
}
