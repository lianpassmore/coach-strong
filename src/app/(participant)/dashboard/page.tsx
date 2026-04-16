"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Target, Loader2, Quote, CalendarClock, Sparkles, GripVertical } from "lucide-react";
import Image from "next/image";
import { getDailyQuote } from "@/lib/quotes";
import { computeCurrentWeek } from "@/lib/weekProgress";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import DailyCheckin from "@/components/DailyCheckin";
import WeeklyGoalsWidget from "@/components/WeeklyGoalsWidget";
import MorningIntentionCard from "@/components/MorningIntentionCard";
import EveningPrepCard from "@/components/EveningPrepCard";
import WeeklyReflectionCard from "@/components/WeeklyReflectionCard";
import PlannerStrip from "@/components/PlannerStrip";
import CycleTracker from "@/components/CycleTracker";
import JournalPromptCard from "@/components/JournalPromptCard";
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CARD_IDS = ["focus", "coach", "goals", "checkin", "evening", "reflection", "planner", "cycle", "journal"] as const;
type CardId = typeof CARD_IDS[number];
const STORAGE_KEY = "dashboard-card-order";

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="relative"
    >
      <div
        className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/10 touch-none cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5 text-white/60" />
      </div>
      {children}
    </div>
  );
}

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

type Profile = {
  full_name: string | null;
  preferred_name: string | null;
  long_term_goal: string | null;
  goal: string | null;
  motivation_word: string | null;
  current_week: number;
  program_start_date: string | null;
  cohort: string | null;
  voice_minutes_cap_per_week: number;
};

type CheckinData = {
  energy_level: number | null;
  assignment_completed: boolean;
  went_well: string | null;
  morning_intention: string | null;
};

type WeeklyGoalData = {
  min_goal: string;
  max_goal: string;
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [weeklyUsedSeconds, setWeeklyUsedSeconds] = useState<number>(0);

  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalData | null>(null);
  const [hasReflection, setHasReflection] = useState(false);

  // P2 state
  const [weeklyPlan, setWeeklyPlan] = useState<Record<string, "training" | "meal_prep" | "rest" | "busy" | null>>({});
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [modMorningIntention, setModMorningIntention] = useState(false);
  const [modEveningPrep, setModEveningPrep] = useState(false);
  const [modWeeklyReflection, setModWeeklyReflection] = useState(false);
  const [modJournal, setModJournal] = useState(false);
  const [lastPeriodStart, setLastPeriodStart] = useState<string | null>(null);
  const [hasJournalEntry, setHasJournalEntry] = useState(false);
  const [cardOrder, setCardOrder] = useState<CardId[]>([...CARD_IDS]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setCardOrder(JSON.parse(saved)); } catch {} }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCardOrder(prev => {
        const next = arrayMove(prev, prev.indexOf(active.id as CardId), prev.indexOf(over.id as CardId));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }

  const todayRef = useRef<string>(
    new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" })
  );

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserEmail(user.email ?? null);
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, preferred_name, long_term_goal, goal, motivation_word, current_week, program_start_date, cohort, voice_minutes_cap_per_week")
        .eq("id", user.id)
        .single();

      // Auto-advance current_week based on days elapsed since program start
      const computedWeek = computeCurrentWeek(data?.program_start_date);
      if (data && computedWeek !== data.current_week) {
        await supabase
          .from("profiles")
          .update({ current_week: computedWeek, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        data.current_week = computedWeek;
      }

      const profileData = data ?? {
        full_name: null, preferred_name: null, long_term_goal: null, goal: null,
        motivation_word: null, current_week: 0, program_start_date: null, cohort: null, voice_minutes_cap_per_week: 120,
      };
      setProfile(profileData);

      const week = profileData.current_week;

      // Load weekly session usage
      const now = new Date();
      const daysFromMonday = (now.getDay() + 6) % 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      const { data: sessions } = await supabase
        .from("conversations")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", weekStart.toISOString());
      const used = sessions?.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) ?? 0;
      setWeeklyUsedSeconds(used);

      // Load today's check-in
      const { data: checkinData } = await supabase
        .from("check_ins")
        .select("energy_level, assignment_completed, went_well, morning_intention")
        .eq("user_id", user.id)
        .eq("checked_in_date", todayRef.current)
        .maybeSingle();
      setCheckin(checkinData ?? null);

      // Load weekly goals (only if program active)
      if (week > 0) {
        const { data: goalData } = await supabase
          .from("weekly_goals")
          .select("min_goal, max_goal")
          .eq("user_id", user.id)
          .eq("week", week)
          .maybeSingle();
        setWeeklyGoal(goalData ?? null);

        // Check if end-of-week reflection exists
        const { data: reflection } = await supabase
          .from("weekly_reflections")
          .select("id")
          .eq("user_id", user.id)
          .eq("week", week)
          .maybeSingle();
        setHasReflection(!!reflection);

        // P2: Weekly plan
        const { data: planRow } = await supabase
          .from("weekly_plan")
          .select("plan")
          .eq("user_id", user.id)
          .eq("week", week)
          .maybeSingle();
        if (planRow?.plan) setWeeklyPlan(planRow.plan);

        // P3: Journal entry check (weeks 4 and 8 only)
        if (week === 4 || week === 8) {
          const { data: journalRow } = await supabase
            .from("journal_entries")
            .select("id")
            .eq("user_id", user.id)
            .eq("week", week)
            .limit(1)
            .maybeSingle();
          setHasJournalEntry(!!journalRow);
        }
      } // end if (week > 0)

      // P2: Profile P2 fields
      const { data: p2Profile } = await supabase
        .from("profiles")
        .select("disruption_mode, cycle_tracking_enabled, show_week_planner, module_morning_intention, module_evening_prep, module_weekly_reflection, module_journal")
        .eq("id", user.id)
        .single();
      setCycleTrackingEnabled(p2Profile?.cycle_tracking_enabled ?? false);
      setShowPlanner(p2Profile?.show_week_planner ?? false);
      setModMorningIntention(p2Profile?.module_morning_intention ?? false);
      setModEveningPrep(p2Profile?.module_evening_prep ?? false);
      setModWeeklyReflection(p2Profile?.module_weekly_reflection ?? false);
      setModJournal(p2Profile?.module_journal ?? false);

      // P2: Last period start (only if cycle tracking enabled)
      const { data: lastPeriod } = p2Profile?.cycle_tracking_enabled
        ? await supabase
            .from("cycle_logs")
            .select("period_start")
            .eq("user_id", user.id)
            .order("period_start", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };
      setLastPeriodStart(lastPeriod?.period_start ?? null);

      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  const displayName = profile?.preferred_name || profile?.full_name?.split(" ")[0] || userEmail?.split("@")[0] || "there";
  const currentWeek = profile?.current_week ?? 0;
  const isProgramStarted = currentWeek > 0;
  const weekTheme = isProgramStarted ? (WEEK_THEMES[currentWeek - 1] ?? "Foundation & Identity") : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-sand font-sans overflow-x-hidden relative text-brand-dark">

      {/* Header */}
      <header className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white pt-10 pb-10 px-6 rounded-b-4xl shadow-lg flex justify-between items-start relative">
        <div className="absolute inset-0 overflow-hidden rounded-b-4xl pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/10 rounded-full blur-[80px]"></div>
        </div>

        <div className="relative z-10 pr-4 w-full">
          <div className="mb-2">
            <Image
              src="/Logo_landscape_OG.png"
              alt="Inspire Change"
              width={120}
              height={34}
              className="brightness-0 invert opacity-90"
            />
          </div>
          {isProgramStarted ? (
            <p className="text-brand-green font-bold text-[10px] uppercase tracking-[0.2em] mb-0.5">
              Week {currentWeek}: {weekTheme}
            </p>
          ) : (
            <p className="text-brand-light font-bold text-[10px] uppercase tracking-[0.2em] mb-0.5">
              Program starts soon
            </p>
          )}
          <h1 className="font-heading text-3xl tracking-wider leading-none">KIA ORA, {displayName.toUpperCase()}</h1>
        </div>

        <AppMenu />
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 -mt-4 space-y-3 relative z-10 pb-3">

        {/* ── WEEK 0: Program not yet started ── */}
        {!isProgramStarted && (
          <>
            <section className="bg-white p-4 rounded-2xl shadow-sm border border-brand-sand">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-5 h-5 text-brand-mid" />
                <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">PROGRAM STARTS SOON</h2>
              </div>
              <p className="text-sm text-brand-grey leading-relaxed mb-3">
                {profile?.cohort
                  ? <>You&apos;re enrolled in the <strong className="text-brand-dark">{profile.cohort}</strong> cohort. Eske is building your personalised plan — you&apos;ll receive everything before kick-off.</>
                  : "Eske is finalising your cohort assignment and building your personalised plan."}
              </p>
              <div className="bg-brand-sand rounded-xl px-3 py-2 text-xs text-brand-grey">
                In the meantime, Coach Strong is available below for casual conversation.
              </div>
            </section>

            {profile?.goal && (
              <section className="bg-white p-4 rounded-2xl shadow-sm border border-brand-sand">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-brand-light" />
                  <h2 className="font-heading text-xl tracking-wide text-brand-dark pt-1">YOUR NORTH STAR</h2>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-0.5">8-Week Goal</p>
                    <p className="text-sm font-bold text-brand-dark">{profile.goal}</p>
                  </div>
                  {profile.motivation_word && (
                    <div>
                      <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-0.5">Focus Word/s</p>
                      <p className="text-base font-heading tracking-wider text-brand-mid">{profile.motivation_word.toUpperCase()}</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── WEEKS 1–8: Active program ── */}
        {isProgramStarted && userId && (
          <>
            {/* Morning intention — pinned top, not reorderable */}
            {modMorningIntention && (
              <MorningIntentionCard
                userId={userId}
                currentWeek={currentWeek}
                todayDate={todayRef.current}
                initialIntention={checkin?.morning_intention ?? null}
              />
            )}

            {/* Sortable cards */}
            {(() => {
              const weeklyCap = (profile?.voice_minutes_cap_per_week ?? 120) * 60;
              const remainingSecs = Math.max(0, weeklyCap - weeklyUsedSeconds);
              const remainingMins = Math.floor(remainingSecs / 60);
              const usedPct = Math.min(100, (weeklyUsedSeconds / weeklyCap) * 100);
              const isLow = remainingMins <= 20;
              const isOut = remainingSecs === 0;

              const cardVisible: Record<CardId, boolean> = {
                focus: true,
                coach: true,
                goals: true,
                checkin: true,
                evening: modEveningPrep,
                reflection: modWeeklyReflection,
                planner: showPlanner,
                cycle: cycleTrackingEnabled,
                journal: modJournal && (currentWeek === 4 || currentWeek === 8),
              };

              const visibleCards = cardOrder.filter(id => cardVisible[id]);

              const renderCardContent = (id: CardId) => {
                switch (id) {
                  case "focus": return (
                    <section className="bg-white p-4 rounded-2xl shadow-sm border border-brand-sand flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-light/10 rounded-full flex items-center justify-center shrink-0 text-brand-light">
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-0.5">Current Focus</h2>
                        <p className="text-sm font-bold text-brand-dark truncate">{profile?.goal ?? "Set your goal in your profile."}</p>
                      </div>
                      {profile?.motivation_word && (
                        <div className="flex bg-brand-sand px-3 py-1.5 rounded-lg border border-brand-grey/10 shrink-0">
                          <span className="text-[10px] font-black uppercase text-brand-mid tracking-wider">{profile.motivation_word}</span>
                        </div>
                      )}
                    </section>
                  );
                  case "coach": return (
                    <section className="bg-brand-dark p-6 rounded-4xl text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center">
                      <div className="absolute -right-10 -top-10 w-48 h-48 bg-brand-mid/50 rounded-full blur-[50px]"></div>
                      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-brand-light/30 rounded-full blur-[50px]"></div>
                      <h2 className="font-logo text-xl font-bold tracking-widest mb-6 z-10">COACH STRONG</h2>
                      <Link href="/voice-session" className="relative group z-10 mb-4">
                        <div className="absolute inset-0 bg-brand-light rounded-full opacity-40 group-hover:animate-ping"></div>
                        <div className="absolute -inset-4 bg-brand-light/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative w-20 h-20 bg-linear-to-tr from-brand-light to-[#0de0ff] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(5,171,196,0.4)] transition-transform active:scale-95">
                          <Mic className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      </Link>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-brand-light z-10 text-center px-4 mb-5">Start a check-in with Coach Strong</p>
                      <div className="z-10 w-full px-2">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Weekly time</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isOut ? "text-red-400" : isLow ? "text-yellow-400" : "text-brand-green"}`}>
                            {isOut ? "Limit reached" : `${remainingMins}m remaining`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isOut ? "bg-red-400" : isLow ? "bg-yellow-400" : "bg-brand-green"}`} style={{ width: `${usedPct}%` }} />
                        </div>
                      </div>
                    </section>
                  );
                  case "goals": return (
                    <WeeklyGoalsWidget userId={userId} week={currentWeek} initialMinGoal={weeklyGoal?.min_goal ?? ""} initialMaxGoal={weeklyGoal?.max_goal ?? ""} />
                  );
                  case "checkin": return (
                    <DailyCheckin userId={userId} currentWeek={currentWeek} todayDate={todayRef.current} hasWeeklyGoal={!!(weeklyGoal?.min_goal || weeklyGoal?.max_goal)} initialEnergy={checkin?.energy_level ?? null} initialTaskDone={checkin?.assignment_completed ?? false} initialWentWell={checkin?.went_well ?? null} initialMorningIntention={checkin?.morning_intention ?? null} />
                  );
                  case "evening": return <EveningPrepCard />;
                  case "reflection": return <WeeklyReflectionCard userId={userId} week={currentWeek} hasReflection={hasReflection} />;
                  case "planner": return <PlannerStrip plan={weeklyPlan} week={currentWeek} />;
                  case "cycle": return <CycleTracker userId={userId} lastPeriodStart={lastPeriodStart} />;
                  case "journal": return <JournalPromptCard userId={userId} week={currentWeek} hasEntry={hasJournalEntry} />;
                }
              };

              return (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={visibleCards} strategy={verticalListSortingStrategy}>
                    {visibleCards.map(id => (
                      <SortableCard key={id} id={id}>
                        {renderCardContent(id)}
                      </SortableCard>
                    ))}
                  </SortableContext>
                </DndContext>
              );
            })()}
          </>
        )}

        {/* Coach Strong for pre-program users */}
        {!isProgramStarted && (
          <section className="bg-brand-dark p-6 rounded-4xl text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-brand-mid/50 rounded-full blur-[50px]"></div>
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-brand-light/30 rounded-full blur-[50px]"></div>

            <h2 className="font-logo text-xl font-bold tracking-widest mb-6 z-10">COACH STRONG</h2>

            <Link href="/voice-session" className="relative group z-10 mb-4">
              <div className="absolute inset-0 bg-brand-light rounded-full opacity-40 group-hover:animate-ping"></div>
              <div className="relative w-20 h-20 bg-linear-to-tr from-brand-light to-[#0de0ff] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(5,171,196,0.4)] transition-transform active:scale-95">
                <Mic className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </Link>

            <p className="text-[10px] font-bold tracking-widest uppercase text-brand-light z-10 text-center px-4">
              Chat with Coach Strong
            </p>
          </section>
        )}

      </div>

      {/* Daily quote — full-width footer */}
      <section className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white px-6 pt-6 pb-8 rounded-t-4xl shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden rounded-t-4xl pointer-events-none">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-light/10 rounded-full blur-[80px]"></div>
        </div>
        <Quote className="absolute -top-2 -left-2 w-14 h-14 text-white/10 rotate-180" />
        <div className="max-w-md mx-auto relative z-10 pl-2">
          <p className="text-white font-sans text-sm font-bold italic leading-relaxed mb-3">
            "{getDailyQuote()}"
          </p>
          <div className="flex items-center gap-2">
            <div className="w-5 h-px bg-brand-light"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-light/70">ESKE DOST</p>
          </div>
        </div>
      </section>
    </main>
  );
}