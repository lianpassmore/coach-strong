"use client";
import { useState, useEffect } from "react";
import { BookOpen, Download, Lock, ChevronDown, ChevronUp, CheckCircle, Star, Loader2, Video, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";

const WEEKS = [
  {
    week: 1, theme: "Foundation & Identity",
    reflection: "You defined your 'Why' — the emotional core that drives your health journey. You completed your personal values mapping and wrote your North Star statement. This week laid the groundwork that every subsequent week builds upon.",
    assignments: ["North Star Statement", "Values Mapping Exercise", "Baseline Health Audit"],
    pdfLabel: "Week 1 Handout",
  },
  {
    week: 2, theme: "Rest & Recovery",
    reflection: "Sleep is the foundation of all performance. This week you're tracking your sleep patterns, identifying your biggest recovery saboteurs, and building a wind-down ritual that protects your most important recovery window.",
    assignments: ["Sleep Audit Journal", "Wind-Down Ritual Planner", "Recovery Protocol"],
    pdfLabel: "Week 2 Handout",
  },
  {
    week: 3, theme: "Movement & Momentum",
    reflection: null,
    assignments: ["Daily Movement Tracker", "Habit Stacking Worksheet", "Energy-Movement Log"],
    pdfLabel: "Week 3 Handout",
  },
  {
    week: 4, theme: "Nutrition & Fuel",
    reflection: null,
    assignments: ["Food & Mood Journal", "Meal Timing Template", "Hydration Tracker"],
    pdfLabel: "Week 4 Handout",
  },
  {
    week: 5, theme: "Mental Toughness",
    reflection: null,
    assignments: ["Stress Response Map", "Resilience Toolkit", "Mindset Journal"],
    pdfLabel: "Week 5 Handout",
  },
  {
    week: 6, theme: "Relationships & Support",
    reflection: null,
    assignments: ["Support System Audit", "Communication Scripts", "Accountability Partner Setup"],
    pdfLabel: "Week 6 Handout",
  },
  {
    week: 7, theme: "Habits & Routines",
    reflection: null,
    assignments: ["Morning Routine Blueprint", "Evening Ritual Planner", "Habit Scorecard"],
    pdfLabel: "Week 7 Handout",
  },
  {
    week: 8, theme: "Your Future Self",
    reflection: null,
    assignments: ["Future Self Letter", "12-Month Vision Map", "Maintenance Protocol"],
    pdfLabel: "Week 8 Handout",
  },
];

export default function Workbook() {
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [availableHandouts, setAvailableHandouts] = useState<Set<number>>(new Set());
  const [downloadingWeek, setDownloadingWeek] = useState<number | null>(null);
  const [onboardingPackExists, setOnboardingPackExists] = useState(false);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [cohortZoomLink, setCohortZoomLink] = useState<string | null>(null);
  const [replayLinks, setReplayLinks] = useState<Record<number, string>>({});
  const [replayTimestamps, setReplayTimestamps] = useState<Record<number, { label: string; seconds: number }[]>>({});
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);
  const [sessionPrepText, setSessionPrepText] = useState<string | null>(null);

  useEffect(() => {
    async function loadWeek() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_week, cohort")
        .eq("id", user.id)
        .single();

      const week = profile?.current_week ?? 0;
      setCurrentWeek(week);
      setExpandedWeek(week > 0 ? week : null);

      // Fetch cohort zoom link + per-week replay links
      if (profile?.cohort) {
        const { data: cohortRow } = await supabase
          .from("cohorts")
          .select("id, zoom_link")
          .eq("name", profile.cohort)
          .single();

        if (cohortRow) {
          setCohortZoomLink(cohortRow.zoom_link ?? null);

          const { data: weeklyRows } = await supabase
            .from("weekly_content")
            .select("week_number, replay_link, replay_timestamps, session_topic, session_prep_text")
            .eq("cohort_id", cohortRow.id);

          const replays: Record<number, string> = {};
          const timestamps: Record<number, { label: string; seconds: number }[]> = {};
          for (const row of weeklyRows ?? []) {
            if (row.replay_link) replays[row.week_number] = row.replay_link;
            if (row.replay_timestamps) timestamps[row.week_number] = row.replay_timestamps;
            if (row.week_number === week) {
              setSessionTopic(row.session_topic ?? null);
              setSessionPrepText(row.session_prep_text ?? null);
            }
          }
          setReplayLinks(replays);
          setReplayTimestamps(timestamps);
        }
      }

      // Check which handout PDFs Eske has uploaded
      const { data: files } = await supabase.storage.from('handouts').list('', { limit: 100 });
      const fileNames = new Set((files ?? []).map(f => f.name));
      const uploaded = new Set(
        (files ?? [])
          .map(f => f.name.match(/^week-(\d+)\.pdf$/))
          .filter(Boolean)
          .map(m => parseInt(m![1]))
      );
      setAvailableHandouts(uploaded);
      setOnboardingPackExists(fileNames.has('onboarding-pack.pdf'));
    }
    loadWeek();
  }, []);

  async function handleDownload(week: number) {
    setDownloadingWeek(week);
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('handouts')
      .createSignedUrl(`week-${week}.pdf`, 60 * 10);
    setDownloadingWeek(null);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  async function handleDownloadPack() {
    setDownloadingPack(true);
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('handouts')
      .createSignedUrl('onboarding-pack.pdf', 60 * 10);
    setDownloadingPack(false);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  if (currentWeek === null) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  const completedCount = Math.max(0, currentWeek - 1);
  const isProgramStarted = currentWeek > 0;

  return (
    <main className="min-h-screen bg-brand-sand pb-24 font-sans text-brand-dark">

      {/* Header */}
      <header className="bg-gradient-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-12 px-6 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(17,12,148,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-8 left-0 w-48 h-48 bg-brand-mid/20 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="relative z-10 flex justify-between items-start mb-4">
          <div>
            <p className="text-brand-green font-bold text-xs uppercase tracking-[0.2em] mb-2">
              {isProgramStarted ? `${completedCount} of 8 weeks complete` : "Program starting soon"}
            </p>
            <h1 className="font-heading text-5xl tracking-wider mb-3">YOUR WORKBOOK</h1>
            <p className="text-white/60 text-sm font-medium">Reflections & handouts for your 8-week journey.</p>
          </div>
          <AppMenu />
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-2">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-700"
              style={{ width: `${(completedCount / 8) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 -mt-6 space-y-4 relative z-10">

        {/* Session prep — shown when Eske has populated it for the current week */}
        {isProgramStarted && sessionTopic && (
          <div className="bg-white rounded-3xl border border-brand-light/30 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-light/10 flex items-center justify-center text-brand-light shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-brand-grey">Prepare for this week's session</p>
                <p className="text-sm font-bold text-brand-dark">{sessionTopic}</p>
              </div>
            </div>
            {sessionPrepText && (
              <ul className="space-y-1.5 pl-1">
                {sessionPrepText.split("\n").filter(Boolean).map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-dark">
                    <span className="text-brand-light font-bold shrink-0 mt-0.5">·</span>
                    {line.replace(/^[-•·]\s*/, "")}
                  </li>
                ))}
              </ul>
            )}
            {cohortZoomLink && (
              <a
                href={cohortZoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2D8CFF] text-white font-bold text-sm rounded-2xl"
              >
                <Video className="w-4 h-4" />
                Join Thursday's session
              </a>
            )}
          </div>
        )}

        {/* Cohort session links — Zoom (cohort-level) — shown when no session prep card */}
        {cohortZoomLink && !sessionTopic && (
          <a
            href={cohortZoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-[#2D8CFF]/10 border border-[#2D8CFF]/30 rounded-3xl p-5 hover:bg-[#2D8CFF]/15 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#2D8CFF] flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-brand-dark">Thursday Group Session</p>
              <p className="text-xs text-brand-grey mt-0.5">8–9pm every Thursday · Tap to join Zoom</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2D8CFF] shrink-0">Join</span>
          </a>
        )}

        {/* Onboarding Pack */}
        {onboardingPackExists && (
          <div className="bg-white rounded-3xl border border-brand-light/30 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-light/10 flex items-center justify-center shrink-0 text-brand-light">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-brand-dark">Onboarding Pack</p>
              <p className="text-xs text-brand-grey mt-0.5">Your pre-program resource guide from Eske</p>
            </div>
            <button
              onClick={handleDownloadPack}
              disabled={downloadingPack}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-light text-white text-xs font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-60 shrink-0"
            >
              {downloadingPack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download
            </button>
          </div>
        )}

        {WEEKS.map((w) => {
          const isExpanded = expandedWeek === w.week;
          const isLocked   = w.week > currentWeek;
          const isComplete = w.week < currentWeek;
          const isCurrent  = w.week === currentWeek;

          return (
            <div
              key={w.week}
              className={`bg-white rounded-3xl border overflow-hidden transition-all duration-300 ${
                isLocked
                  ? "border-brand-sand opacity-60"
                  : "border-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              {/* Card header */}
              <div
                className={`flex items-center gap-4 p-5 ${!isLocked ? "cursor-pointer hover:bg-brand-sand/30 transition-colors" : ""}`}
                onClick={() => !isLocked && setExpandedWeek(isExpanded ? null : w.week)}
              >
                {/* Week number circle */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-heading text-xl tracking-wide ${
                  isComplete ? "bg-brand-green/20 text-brand-mid" :
                  isCurrent  ? "bg-brand-dark text-white shadow-lg" :
                               "bg-brand-sand text-brand-grey"
                }`}>
                  {isComplete ? <CheckCircle className="w-6 h-6" /> : w.week}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-grey">Week {w.week}</p>
                    {isCurrent && (
                      <span className="bg-brand-dark text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    {isComplete && (
                      <span className="bg-brand-green/20 text-brand-mid text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-base mt-0.5 ${isLocked ? "text-brand-grey" : "text-brand-dark"}`}>
                    {w.theme}
                  </p>
                </div>

                <div className="shrink-0">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-brand-grey/40" />
                  ) : isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-brand-grey" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-brand-grey" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && !isLocked && (
                <div className="border-t border-brand-sand px-5 pb-6 pt-4 space-y-5">

                  {/* Reflection */}
                  {w.reflection && (
                    <div className="bg-brand-sand rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-brand-mid" />
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-mid">Weekly Reflection</p>
                      </div>
                      <p className="text-sm text-brand-dark leading-relaxed">{w.reflection}</p>
                    </div>
                  )}

                  {/* Assignments */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-grey mb-3">This Week's Exercises</p>
                    <div className="space-y-2">
                      {w.assignments.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-brand-sand/60">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isComplete ? "bg-brand-green text-white" : "bg-brand-grey/20 text-brand-grey"
                          }`}>
                            {isComplete ? (
                              <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                            ) : (
                              <BookOpen className="w-3 h-3" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-brand-dark">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Session replay with optional timestamps */}
                  {replayLinks[w.week] && (
                    <div className="space-y-2">
                      <a
                        href={replayLinks[w.week]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-mid/10 border border-brand-mid/20 text-brand-mid font-bold text-sm tracking-wide hover:bg-brand-mid/20 transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Watch Session Replay
                      </a>
                      {replayTimestamps[w.week]?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-brand-grey px-1">Jump to</p>
                          <div className="flex flex-wrap gap-2">
                            {replayTimestamps[w.week].map((ts, i) => {
                              const mins = Math.floor(ts.seconds / 60);
                              const secs = String(ts.seconds % 60).padStart(2, "0");
                              return (
                                <a
                                  key={i}
                                  href={`${replayLinks[w.week]}#t=${ts.seconds}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-sand rounded-xl text-xs font-bold text-brand-dark hover:bg-brand-grey/20 transition-colors"
                                >
                                  <PlayCircle className="w-3 h-3 text-brand-mid shrink-0" />
                                  {ts.label}
                                  <span className="text-brand-grey font-normal">{mins}:{secs}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Download button — enabled only when Eske has uploaded the PDF */}
                  {availableHandouts.has(w.week) ? (
                    <button
                      onClick={() => handleDownload(w.week)}
                      disabled={downloadingWeek === w.week}
                      className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-dark text-white font-bold text-sm tracking-wide shadow-[0_4px_16px_rgba(17,12,148,0.25)] hover:shadow-[0_6px_20px_rgba(17,12,148,0.35)] active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {downloadingWeek === w.week
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                      {downloadingWeek === w.week ? "Preparing…" : `Download ${w.pdfLabel}`}
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-brand-sand text-brand-grey font-bold text-sm tracking-wide cursor-default">
                      <Download className="w-4 h-4 opacity-40" />
                      Handout coming soon
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
