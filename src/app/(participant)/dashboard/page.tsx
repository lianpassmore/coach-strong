"use client";
import { useState, useEffect, useMemo } from "react";
import { Mic, Target, Loader2, Quote, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Components & Libs
import { createClient } from "@/lib/supabase/client";
import { getDailyQuote } from "@/lib/quotes";
import AppMenu from "@/components/AppMenu";
import DailyCheckin from "@/components/DailyCheckin";
import WeeklyGoalsWidget from "@/components/WeeklyGoalsWidget";
import MorningIntentionCard from "@/components/MorningIntentionCard";
import EveningPrepCard from "@/components/EveningPrepCard";
import WeeklyReflectionCard from "@/components/WeeklyReflectionCard";
import PlannerStrip from "@/components/PlannerStrip";
import CycleTracker from "@/components/CycleTracker";

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [checkin, setCheckin] = useState<any>(null);
  const [showTools, setShowTools] = useState(false); // For collapsible secondary trackers
  const [currentTime, setCurrentTime] = useState(new Date().getHours());

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Get daily check-in status
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
      const { data: checkinData } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .eq("checked_in_date", today)
        .maybeSingle();

      setProfile(profileData);
      setCheckin(checkinData);
      setLoading(false);
    }
    loadDashboard();
  }, []);

  // Contextual Logic: What should the user do RIGHT NOW?
  const ActiveTask = useMemo(() => {
    if (!profile) return null;
    const hour = currentTime;
    const day = new Date().getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

    // 1. Priority: End of Week Reflection (Fri/Sat/Sun if not done)
    if ((day >= 5 || day === 0) && profile.current_week > 0) {
        return <WeeklyReflectionCard userId={profile.id} week={profile.current_week} hasReflection={false} />;
    }
    // 2. Morning: Intention (Before 11 AM)
    if (hour < 11) {
      return <MorningIntentionCard userId={profile.id} currentWeek={profile.current_week} todayDate={new Date().toISOString()} initialIntention={checkin?.morning_intention} />;
    }
    // 3. Evening: Reflection (After 6 PM / 18:00)
    if (hour >= 18) {
      return <EveningPrepCard />;
    }
    // 4. Mid-day: The Daily Check-in (11 AM - 6 PM)
    return (
      <DailyCheckin
        userId={profile.id}
        currentWeek={profile.current_week}
        todayDate={new Date().toISOString()}
        hasWeeklyGoal={false}
        initialEnergy={checkin?.energy_level ?? null}
        initialTaskDone={checkin?.assignment_completed ?? false}
        initialWentWell={checkin?.went_well ?? null}
        initialMorningIntention={checkin?.morning_intention ?? null}
      />
    );
  }, [profile, currentTime, checkin]);

  if (loading) return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
    </div>
  );

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark">
      
      {/* 1. MINIMAL HEADER */}
      <header className="bg-brand-dark text-white pt-10 pb-6 px-6 rounded-b-[2rem] shadow-lg flex justify-between items-center">
        <div>
          <p className="text-brand-green font-bold text-[10px] uppercase tracking-widest">
            WEEK {profile?.current_week || 0} • {profile?.cohort || 'Core'}
          </p>
          <h1 className="font-heading text-2xl tracking-wide">KIA ORA, {profile?.preferred_name?.toUpperCase()}</h1>
        </div>
        <AppMenu />
      </header>

      <div className="max-w-md mx-auto px-5 space-y-6 -mt-4">
        
        {/* 2. THE HERO: COACH STRONG AI (The Digital Brain) */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-brand-light/20 flex flex-col items-center text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4"><Sparkles className="w-5 h-5 text-brand-light opacity-30" /></div>
           <h2 className="text-[10px] font-black tracking-[0.2em] text-brand-grey mb-4 uppercase">24/7 Digital Brain</h2>
           
           <Link href="/voice-session" className="relative group mb-4">
              <div className="absolute inset-0 bg-brand-light rounded-full opacity-20 group-hover:animate-ping"></div>
              <div className="relative w-24 h-24 bg-brand-dark rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95">
                <Mic className="w-10 h-10 text-brand-light" />
              </div>
           </Link>
           
           <p className="font-heading text-xl text-brand-dark tracking-wide">TALK TO COACH STRONG</p>
           <p className="text-xs text-brand-grey mt-1">Check-in, vent, or ask for advice</p>
        </section>

        {/* 3. THE CONTEXTUAL TASK (Changes based on time) */}
        <div className="space-y-2">
           <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest px-2">Your Daily Path</p>
           {ActiveTask}
        </div>

        {/* 4. THE FOCUS STRIP (Goals) */}
        <section className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white flex items-center gap-4">
           <div className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-brand-green" />
           </div>
           <div className="flex-1">
              <p className="text-[10px] font-black text-brand-grey uppercase">Current Goal</p>
              <p className="text-sm font-bold truncate">{profile?.goal || "Stay consistent"}</p>
           </div>
           {profile?.motivation_word && (
              <div className="bg-brand-sand px-3 py-1 rounded-full border border-brand-dark/5">
                <span className="text-[10px] font-bold uppercase">{profile.motivation_word}</span>
              </div>
           )}
        </section>

        {/* 5. THE "VAULT" & TOOLS (Collapsible to reduce clutter) */}
        <div className="pt-2">
           <button 
             onClick={() => setShowTools(!showTools)}
             className="w-full flex items-center justify-between px-4 py-3 bg-brand-sand border border-brand-dark/5 rounded-xl text-brand-grey hover:text-brand-dark transition-colors"
           >
              <span className="text-xs font-bold uppercase tracking-widest">More Tools & Tracking</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTools ? "rotate-180" : ""}`} />
           </button>

           {showTools && (
             <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                <WeeklyGoalsWidget userId={profile.id} week={profile.current_week} initialMinGoal="" initialMaxGoal="" />
                {(profile.show_week_planner ?? true) && (
                  <PlannerStrip plan={{}} week={profile.current_week} />
                )}
                {profile.cycle_tracking_enabled && (
                  <CycleTracker userId={profile.id} lastPeriodStart={null} />
                )}
             </div>
           )}
        </div>

        {/* 6. DAILY QUOTE */}
        <section className="text-center px-6 py-4">
           <Quote className="w-6 h-6 text-brand-light opacity-40 mx-auto mb-2" />
           <p className="text-sm italic font-medium text-brand-dark/80 leading-relaxed">
             "{getDailyQuote()}"
           </p>
           <p className="text-[9px] font-black uppercase tracking-widest mt-2 text-brand-grey">— ESKE DOST</p>
        </section>

      </div>
    </main>
  );
}