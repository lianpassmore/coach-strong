"use client";
import { useState } from "react";
import { Coffee, X } from "lucide-react";

export default function AfternoonNudgeCard() {
  // Show between 14:00 and 15:30 NZ time
  const hourNZ = parseInt(
    new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", hour12: false })
  );
  const minNZ = parseInt(
    new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", minute: "numeric" })
  );
  const totalMins = hourNZ * 60 + minNZ;
  const isAfternoon = totalMins >= 14 * 60 && totalMins < 15 * 60 + 30;

  const [dismissed, setDismissed] = useState(false);

  if (!isAfternoon || dismissed) return null;

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coffee className="w-4 h-4 text-brand-mid" />
          <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">AFTERNOON CHECK</h2>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-brand-dark">Have you eaten since lunch?</p>
        <p className="text-xs text-brand-grey leading-relaxed">
          This is the window where the energy dip hits and the office lolly jar starts calling. A snack with protein now changes the rest of your afternoon.
        </p>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 py-2.5 bg-brand-dark text-white font-bold text-sm rounded-xl"
        >
          Yes, sorted
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 py-2.5 bg-brand-sand text-brand-grey font-bold text-sm rounded-xl"
        >
          Going now
        </button>
      </div>
    </section>
  );
}
