"use client";
import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  initialEnabled: boolean;
};

export default function DisruptionModeToggle({ userId, initialEnabled }: Props) {
  const supabase = createClient();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const next = !enabled;
    setEnabled(next);
    await supabase
      .from("profiles")
      .update({ disruption_mode: next })
      .eq("id", userId);
    setSaving(false);
  }

  return (
    <section className={`p-4 rounded-2xl shadow-sm border transition-colors ${
      enabled
        ? "bg-yellow-50 border-yellow-200"
        : "bg-white border-brand-sand"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          enabled ? "bg-yellow-100 text-yellow-600" : "bg-brand-sand text-brand-grey"
        }`}>
          <Zap className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-brand-dark">Disruption mode</p>
          <p className="text-xs text-brand-grey mt-0.5">
            {enabled
              ? "On — Coach Strong will adapt to your week"
              : "Travelling or having a disrupted week?"}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`relative w-12 h-7 rounded-full transition-colors duration-300 shrink-0 ${
            enabled ? "bg-yellow-400" : "bg-brand-grey/30"
          } disabled:opacity-50`}
        >
          {saving ? (
            <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-white" />
          ) : (
            <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`} />
          )}
        </button>
      </div>
    </section>
  );
}
