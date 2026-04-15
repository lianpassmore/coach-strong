"use client";
import { useState, useEffect } from "react";
import { Loader2, PenLine, Plus, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const WEEK_THEMES = [
  "Foundation & Identity",
  "Rest & Recovery",
  "Movement & Momentum",
  "Nutrition & Fuel",
  "Mental Toughness",
  "Relationships & Support",
  "Habits & Routines",
  "Your Future Self",
];

type Entry = {
  id: string;
  week: number;
  content: string;
  created_at: string;
};

function WriteModal({
  userId,
  week,
  onClose,
  onSaved,
}: {
  userId: string;
  week: number;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}) {
  const supabase = createClient();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("journal_entries")
      .insert({ user_id: userId, week, content: content.trim() })
      .select("id, week, content, created_at")
      .single();
    setSaving(false);
    if (data) {
      setDone(true);
      onSaved(data);
      setTimeout(onClose, 900);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-0.5">
              Week {week} · {WEEK_THEMES[week - 1]}
            </p>
            <h2 className="font-heading text-2xl tracking-wide text-brand-dark">WHAT I NOW KNOW</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-sand transition-colors">
            <X className="w-5 h-5 text-brand-grey" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-brand-green" />
            </div>
            <p className="font-bold text-brand-dark text-center">Insight saved.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-2">
                What do you now know about yourself that you didn't before?
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write freely — these words are for you…"
                rows={5}
                autoFocus
                className="w-full px-4 py-3 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="w-full py-3.5 bg-brand-dark text-white font-bold text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving…" : "Save insight"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [writeWeek, setWriteWeek] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_week")
        .eq("id", user.id)
        .single();

      const week = profile?.current_week ?? 0;
      setCurrentWeek(week);
      setWriteWeek(week || 1);

      const { data } = await supabase
        .from("journal_entries")
        .select("id, week, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function handleNewEntry() {
    setWriteWeek(currentWeek || 1);
    setShowModal(true);
  }

  function handleEntrySaved(entry: Entry) {
    setEntries((prev) => [entry, ...prev]);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  return (
    <>
      {showModal && userId && (
        <WriteModal
          userId={userId}
          week={writeWeek}
          onClose={() => setShowModal(false)}
          onSaved={handleEntrySaved}
        />
      )}

      <main className="min-h-screen bg-brand-sand pb-24 font-sans text-brand-dark">
        <header className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-20 px-6 rounded-b-4xl shadow-[0_10px_30px_rgba(17,12,148,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-mid/30 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <HomeButton />
              <p className="text-brand-light font-bold text-xs uppercase tracking-[0.2em] mb-1 mt-3">Insights</p>
              <h1 className="font-heading text-4xl tracking-wider">MY JOURNAL</h1>
            </div>
            <AppMenu />
          </div>
        </header>

        <div className="max-w-md mx-auto px-5 -mt-10 space-y-4 relative z-10">

          {/* Intro card */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-brand-sand">
            <div className="flex items-start gap-3">
              <PenLine className="w-5 h-5 text-brand-mid shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-brand-dark mb-1">What I now know</p>
                <p className="text-xs text-brand-grey leading-relaxed">
                  Capture the realisations that matter. Your own words are more powerful than anything Coach Strong can say. These insights are surfaced back to you when motivation dips.
                </p>
              </div>
            </div>
          </section>

          {/* Write new entry */}
          <button
            onClick={handleNewEntry}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-dark text-white font-bold text-sm rounded-2xl shadow-sm active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Write a new insight
          </button>

          {/* Entry list */}
          {entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-brand-grey text-sm font-bold">No entries yet.</p>
              <p className="text-brand-grey text-xs mt-1">Your first insight is waiting to be written.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const date = new Date(entry.created_at).toLocaleDateString("en-NZ", {
                  timeZone: "Pacific/Auckland",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const preview = entry.content.length > 100
                  ? entry.content.slice(0, 100) + "…"
                  : entry.content;

                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl shadow-sm border border-brand-sand overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full p-4 text-left flex items-start gap-3 hover:bg-brand-sand/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-brand-mid/10 flex items-center justify-center shrink-0 font-heading text-sm text-brand-mid">
                        {entry.week}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-0.5">
                          Week {entry.week} · {WEEK_THEMES[entry.week - 1]} · {date}
                        </p>
                        <p className="text-sm text-brand-dark leading-relaxed">
                          {isExpanded ? entry.content : preview}
                        </p>
                      </div>
                      <div className="shrink-0 text-brand-grey pt-1">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isExpanded && entry.content.length > 100 && (
                      <div className="px-4 pb-4 pt-0">
                        <button
                          onClick={() => {
                            setWriteWeek(entry.week);
                            setShowModal(true);
                          }}
                          className="text-xs font-bold text-brand-light hover:underline"
                        >
                          + Add another insight for Week {entry.week}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
