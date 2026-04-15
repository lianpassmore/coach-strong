"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, User, Calendar, Target, Zap, MessageSquare,
  ChevronDown, ChevronUp, Plus, Trash2, Save, CheckCircle2, X,
  TrendingUp, BookOpen, FileText,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  email: string;
  goal: string | null;
  long_term_goal: string | null;
  motivation_word: string | null;
  current_week: number | null;
  cohort: string | null;
  program_phase: string | null;
  program_start_date: string | null;
  created_at: string;
  weekly_cap_minutes: number;
};

type CheckIn = {
  id: string;
  checked_in_date: string;
  week: number;
  energy_level: number | null;
  assignment_completed: boolean;
  created_at: string;
};

type Conversation = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string | null;
  transcript: { role: string; message: string }[] | null;
};

type CoachNote = {
  id: string;
  note: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(dateStr).toLocaleDateString("en-NZ", opts ?? {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function energyColour(e: number) {
  if (e >= 4) return "bg-brand-green text-white";
  if (e === 3) return "bg-amber-400 text-white";
  return "bg-red-400 text-white";
}

function energyBarColour(e: number) {
  if (e >= 4) return "bg-brand-green";
  if (e === 3) return "bg-amber-400";
  return "bg-red-400";
}

// ── Energy Chart ──────────────────────────────────────────────────────────────

function EnergyChart({ checkIns }: { checkIns: CheckIn[] }) {
  // Group by week: take the latest check-in energy per week
  const byWeek = new Map<number, number>();
  for (const ci of [...checkIns].reverse()) {
    if (ci.energy_level !== null) byWeek.set(ci.week, ci.energy_level);
  }
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="flex items-end gap-2 h-24 mt-2">
      {weeks.map(w => {
        const e = byWeek.get(w);
        return (
          <div key={w} className="flex-1 flex flex-col items-center gap-1">
            {e !== undefined ? (
              <div
                className={`w-full rounded-t-lg transition-all ${energyBarColour(e)}`}
                style={{ height: `${(e / 5) * 80}px` }}
                title={`Week ${w}: ${e}/5`}
              />
            ) : (
              <div className="w-full rounded-t-lg bg-brand-sand" style={{ height: "16px" }} />
            )}
            <span className="text-[9px] font-bold text-brand-grey">W{w}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [checkIns, setCheckIns]         = useState<CheckIn[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [coachNotes, setCoachNotes]     = useState<CoachNote[]>([]);

  const [expandedConv, setExpandedConv] = useState<string | null>(null);

  // Weekly cap editing
  const [capMinutes, setCapMinutes] = useState<number>(120);
  const [savingCap, setSavingCap]   = useState(false);
  const [capSaved, setCapSaved]     = useState(false);

  // Coach note input
  const [noteText, setNoteText]   = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved]   = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/participant/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load participant");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
      setCapMinutes(data.profile.weekly_cap_minutes ?? 120);
      setCheckIns(data.checkIns);
      setConversations(data.conversations);
      setCoachNotes(data.coachNotes);
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveCap() {
    setSavingCap(true);
    await fetch(`/api/admin/participant/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly_cap_minutes: capMinutes }),
    });
    setSavingCap(false);
    setCapSaved(true);
    setTimeout(() => setCapSaved(false), 2000);
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await fetch('/api/admin/coach-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, note: noteText.trim() }),
    });
    setSavingNote(false);
    if (res.ok) {
      const { note } = await res.json();
      setCoachNotes(prev => [note, ...prev]);
      setNoteText("");
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    await fetch('/api/admin/coach-notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId }),
    });
    setCoachNotes(prev => prev.filter(n => n.id !== noteId));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-brand-sand flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-500 font-bold">{error ?? "Participant not found"}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </main>
    );
  }

  const displayName = profile.full_name ?? profile.email;
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-brand-sand font-sans text-brand-dark">

      {/* Header */}
      <header className="bg-linear-to-r from-brand-dark to-[#1a15a3] text-white px-8 py-5 flex items-center gap-4 shadow-lg">
        <button
          onClick={() => router.push("/admin")}
          className="p-2 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-black shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="font-heading text-2xl tracking-widest leading-none">{displayName.toUpperCase()}</h1>
          <p className="text-white/50 text-xs mt-1">
            {profile.email} · {profile.cohort ?? "No cohort"} · {profile.program_phase === "onboarding" ? "Onboarding" : `Week ${profile.current_week}`}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Profile & Goals ─────────────────────────────────────── */}
          <div className="bg-white rounded-3xl p-6 border border-white shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-dark/5 rounded-xl text-brand-dark"><Target className="w-5 h-5" /></div>
              <h2 className="font-heading text-2xl tracking-wide pt-1">GOALS & IDENTITY</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Preferred Name", value: profile.preferred_name },
                { label: "Primary Goal", value: profile.goal },
                { label: "Long-Term Goal", value: profile.long_term_goal },
                { label: "One Word", value: profile.motivation_word },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm font-semibold text-brand-dark">{value ?? <span className="text-brand-grey italic">Not set</span>}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-sand pt-4">
              <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-2">Weekly Coaching Cap</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCapMinutes(m => Math.max(10, m - 10))}
                  className="w-9 h-9 rounded-xl bg-brand-sand text-brand-dark font-black text-lg flex items-center justify-center hover:bg-brand-grey/20 transition-colors"
                >−</button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-black text-brand-dark">{capMinutes}</span>
                  <span className="text-sm text-brand-grey ml-1">min / week</span>
                </div>
                <button
                  onClick={() => setCapMinutes(m => m + 10)}
                  className="w-9 h-9 rounded-xl bg-brand-sand text-brand-dark font-black text-lg flex items-center justify-center hover:bg-brand-grey/20 transition-colors"
                >+</button>
                <button
                  onClick={saveCap}
                  disabled={savingCap}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-bold tracking-wide disabled:opacity-60"
                >
                  {savingCap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : capSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" /> : <Save className="w-3.5 h-3.5" />}
                  {capSaved ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            <div className="border-t border-brand-sand pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Joined</p>
                <p className="font-semibold">{fmt(profile.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Program Start</p>
                <p className="font-semibold">{profile.program_start_date ? fmt(profile.program_start_date) : "–"}</p>
              </div>
            </div>
          </div>

          {/* ── Energy Over Time ─────────────────────────────────────── */}
          <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-brand-mid/10 rounded-xl text-brand-mid"><TrendingUp className="w-5 h-5" /></div>
              <h2 className="font-heading text-2xl tracking-wide pt-1">ENERGY TREND</h2>
            </div>

            {checkIns.length === 0 ? (
              <p className="text-sm text-brand-grey text-center py-8">No check-ins yet.</p>
            ) : (
              <>
                <EnergyChart checkIns={checkIns} />
                <div className="flex gap-3 mt-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-green inline-block" />4–5 Good</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />3 OK</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />1–2 Low</span>
                </div>
              </>
            )}

            {/* Check-in history */}
            {checkIns.length > 0 && (
              <div className="mt-5 border-t border-brand-sand pt-4 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-2">Check-in History</p>
                {checkIns.map(ci => (
                  <div key={ci.id} className="flex items-center gap-3 text-sm">
                    <span className="text-brand-grey text-xs w-24 shrink-0">{fmt(ci.checked_in_date, { day: "numeric", month: "short" })}</span>
                    {ci.energy_level !== null ? (
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${energyColour(ci.energy_level)}`}>
                        {ci.energy_level}
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-lg bg-brand-sand flex items-center justify-center text-xs text-brand-grey shrink-0">–</span>
                    )}
                    <span className={`text-xs font-semibold ${ci.assignment_completed ? "text-brand-green" : "text-brand-grey"}`}>
                      {ci.assignment_completed ? "Assignment done" : "Assignment pending"}
                    </span>
                    <span className="text-[10px] text-brand-grey ml-auto shrink-0">Wk {ci.week}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Conversations ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light"><MessageSquare className="w-5 h-5" /></div>
            <h2 className="font-heading text-2xl tracking-wide pt-1">CONVERSATIONS</h2>
            <span className="ml-auto text-xs font-bold text-brand-grey bg-brand-sand px-3 py-1 rounded-full">{conversations.length} total</span>
          </div>

          {conversations.length === 0 ? (
            <p className="text-sm text-brand-grey text-center py-8">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, idx) => {
                const isExp = expandedConv === conv.id;
                return (
                  <div key={conv.id} className="rounded-2xl border border-brand-sand overflow-hidden">
                    <button
                      onClick={() => setExpandedConv(isExp ? null : conv.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-brand-sand/30 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-dark/10 flex items-center justify-center text-[11px] font-black text-brand-dark shrink-0">
                        {conversations.length - idx}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{fmt(conv.started_at, { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p className="text-xs text-brand-grey mt-0.5">
                          {conv.duration_seconds ? fmtTime(conv.duration_seconds) : "Duration unknown"}
                          {conv.status && ` · ${conv.status}`}
                        </p>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-brand-grey shrink-0" /> : <ChevronDown className="w-4 h-4 text-brand-grey shrink-0" />}
                    </button>

                    {isExp && (
                      <div className="border-t border-brand-sand p-4">
                        {!conv.transcript || conv.transcript.length === 0 ? (
                          <p className="text-sm text-brand-grey italic">No transcript available.</p>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {conv.transcript.map((turn, i) => (
                              <div key={i} className={`flex gap-3 ${turn.role === "user" ? "flex-row" : "flex-row-reverse"}`}>
                                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  turn.role === "user" ? "bg-brand-sand text-brand-dark" : "bg-brand-dark text-white"
                                }`}>
                                  {turn.role === "user" ? "P" : "AI"}
                                </div>
                                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                  turn.role === "user"
                                    ? "bg-brand-sand text-brand-dark rounded-tl-sm"
                                    : "bg-brand-dark text-white rounded-tr-sm"
                                }`}>
                                  {turn.message}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Coach Notes ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-mid"><BookOpen className="w-5 h-5" /></div>
            <h2 className="font-heading text-2xl tracking-wide pt-1">COACH NOTES</h2>
          </div>

          {/* New note input */}
          <div className="mb-6">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              placeholder="Add a private observation — things from group calls, WhatsApp, or one-on-ones that the AI won't capture…"
              className="w-full px-4 py-3 bg-brand-sand rounded-2xl text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none resize-none leading-relaxed"
            />
            <button
              onClick={saveNote}
              disabled={savingNote || !noteText.trim()}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50"
            >
              {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : noteSaved ? <CheckCircle2 className="w-4 h-4 text-brand-green" /> : <Save className="w-4 h-4" />}
              {savingNote ? "Saving…" : noteSaved ? "Saved!" : "Add Note"}
            </button>
          </div>

          {/* Existing notes */}
          {coachNotes.length === 0 ? (
            <p className="text-sm text-brand-grey text-center py-4">No notes yet. Add your first observation above.</p>
          ) : (
            <div className="space-y-3">
              {coachNotes.map(note => (
                <div key={note.id} className="flex gap-3 p-4 rounded-2xl bg-brand-sand group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed text-brand-dark">{note.note}</p>
                    <p className="text-[10px] text-brand-grey mt-2 font-semibold">
                      {fmt(note.created_at, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="shrink-0 p-1.5 text-brand-grey opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
