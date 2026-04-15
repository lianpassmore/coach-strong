"use client";
import { useState } from "react";
import { PenLine, Check, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const WEEK_THEMES = [
  "Foundation & Identity", "Rest & Recovery", "Movement & Momentum", "Nutrition & Fuel",
  "Mental Toughness", "Relationships & Support", "Habits & Routines", "Your Future Self",
];

type Props = {
  userId: string;
  week: number;
  hasEntry: boolean;
};

export default function JournalPromptCard({ userId, week, hasEntry: initialHasEntry }: Props) {
  // Only show at weeks 4 and 8
  if (week !== 4 && week !== 8) return null;

  const supabase = createClient();
  const [hasEntry, setHasEntry] = useState(initialHasEntry);
  const [showWrite, setShowWrite] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || hasEntry) return null;

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    await supabase
      .from("journal_entries")
      .insert({ user_id: userId, week, content: content.trim() });
    setSaving(false);
    setHasEntry(true);
  }

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-light/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-brand-mid" />
          <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">
            WEEK {week} INSIGHT
          </h2>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!showWrite ? (
        <>
          <p className="text-xs text-brand-grey leading-relaxed mb-4">
            Week {week} milestone. What do you now know about yourself that you didn't before? These are the words you'll want to read again.
          </p>
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">
            {WEEK_THEMES[week - 1]}
          </p>
          <button
            onClick={() => setShowWrite(true)}
            className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 mt-2"
          >
            <PenLine className="w-4 h-4" /> Write my insight
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block">
            What do you now know?
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write freely…"
            rows={4}
            autoFocus
            className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
          />
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="w-full py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Save insight"}
          </button>
        </div>
      )}
    </section>
  );
}
