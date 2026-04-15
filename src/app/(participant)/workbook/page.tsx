"use client";
import { useState, useEffect } from "react";
import { 
  BookOpen, Download, Lock, ChevronDown, CheckCircle, 
  Star, Loader2, Video, PlayCircle, Clock, Zap 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

// Constants (Keep your WEEKS array as is)
const WEEKS = [
  { week: 1, theme: "Foundation & Identity", assignments: ["North Star Statement", "Values Mapping", "Health Audit"] },
  { week: 2, theme: "Rest & Recovery", assignments: ["Sleep Audit", "Wind-Down Ritual", "Recovery Protocol"] },
  { week: 3, theme: "Movement & Momentum", assignments: ["Daily Movement Tracker", "Habit Stacking", "Energy Log"] },
  { week: 4, theme: "Nutrition & Fuel", assignments: ["Food & Mood Journal", "Meal Timing", "Hydration Tracker"] },
  { week: 5, theme: "Mental Toughness", assignments: ["Stress Response Map", "Resilience Toolkit", "Mindset Journal"] },
  { week: 6, theme: "Relationships & Support", assignments: ["Support System Audit", "Communication Scripts"] },
  { week: 7, theme: "Habits & Routines", assignments: ["Morning Blueprint", "Evening Ritual", "Habit Scorecard"] },
  { week: 8, theme: "Your Future Self", assignments: ["Future Self Letter", "12-Month Vision Map"] },
];

export default function Workbook() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);
  const [sessionPrepText, setSessionPrepText] = useState<string | null>(null);
  const [zoomLink, setZoomLink] = useState<string | null>(null);
  const [replays, setReplays] = useState<Record<number, any>>({});

  useEffect(() => {
    async function loadWorkbook() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setCurrentWeek(profile?.current_week || 1);
      setExpandedWeek(profile?.current_week || 1);

      if (profile?.cohort) {
        const { data: cohort } = await supabase.from("cohorts").select("*").eq("name", profile.cohort).single();
        setZoomLink(cohort?.zoom_link || null);
        
        const { data: content } = await supabase.from("weekly_content").select("*").eq("cohort_id", cohort?.id);
        const replayMap: any = {};
        content?.forEach(row => {
          replayMap[row.week_number] = row;
          if (row.week_number === (profile?.current_week || 1)) {
            setSessionTopic(row.session_topic);
            setSessionPrepText(row.session_prep_text);
          }
        });
        setReplays(replayMap);
      }
      setLoading(false);
    }
    loadWorkbook();
  }, []);

  if (loading) return <div className="min-h-screen bg-brand-sand flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>;

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden">
      
      {/* HEADER */}
      <header className="bg-brand-dark text-white pt-12 pb-10 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <HomeButton />
            <div>
               <h1 className="font-heading text-3xl tracking-wider leading-none uppercase">Workbook</h1>
               <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em] mt-1">
                 {currentWeek} of 8 Weeks Unlocked
               </p>
            </div>
          </div>
          <AppMenu />
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10">

        {/* ACTIVE FOCUS CARD (The "Now") */}
        {sessionTopic && (
          <section className="bg-white rounded-[2rem] p-6 shadow-xl border border-brand-light/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4"><Zap className="w-5 h-5 text-brand-light opacity-20" /></div>
             <p className="text-[10px] font-black text-brand-light uppercase tracking-widest mb-2">This Week's Focus</p>
             <h2 className="text-xl font-bold text-brand-dark mb-4">{sessionTopic}</h2>
             
             {sessionPrepText && (
               <div className="bg-brand-sand/50 rounded-2xl p-4 mb-6 border border-brand-dark/5">
                 <p className="text-[10px] font-black text-brand-grey uppercase mb-2">Prep for Session</p>
                 <p className="text-sm text-brand-dark leading-relaxed italic">"{sessionPrepText}"</p>
               </div>
             )}

             {zoomLink && (
               <a href={zoomLink} target="_blank" className="flex items-center justify-center gap-3 w-full py-4 bg-[#2D8CFF] text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                  <Video className="w-5 h-5" />
                  Join Live Session
               </a>
             )}
          </section>
        )}

        {/* WEEKLY TIMELINE */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest px-2">The 8-Week Path</p>
          
          {WEEKS.map((w) => {
            const isLocked = w.week > currentWeek;
            const isCurrent = w.week === currentWeek;
            const isExpanded = expandedWeek === w.week;
            const weekContent = replays[w.week];

            return (
              <div key={w.week} className={`transition-all ${isLocked ? "opacity-40" : "opacity-100"}`}>
                <div 
                  onClick={() => !isLocked && setExpandedWeek(isExpanded ? null : w.week)}
                  className={`bg-white p-5 rounded-3xl border flex items-center gap-4 shadow-sm transition-all ${
                    isCurrent ? "border-brand-light ring-1 ring-brand-light/20" : "border-brand-sand"
                  }`}
                >
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-heading text-xl ${
                     isCurrent ? "bg-brand-dark text-white" : "bg-brand-sand text-brand-grey"
                   }`}>
                     {w.week < currentWeek ? <CheckCircle className="w-6 h-6 text-brand-green" /> : w.week}
                   </div>

                   <div className="flex-1">
                      <p className="text-[9px] font-black text-brand-grey uppercase tracking-widest">Week {w.week}</p>
                      <p className="text-sm font-bold text-brand-dark">{w.theme}</p>
                   </div>

                   {!isLocked && (
                     <ChevronDown className={`w-5 h-5 text-brand-grey transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                   )}
                   {isLocked && <Lock className="w-4 h-4 text-brand-grey/30" />}
                </div>

                {/* EXPANDED CONTENT */}
                {isExpanded && !isLocked && (
                  <div className="px-2 pt-2 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Assignments */}
                    <div className="bg-white/50 rounded-2xl p-4 border border-brand-sand">
                       <p className="text-[9px] font-black text-brand-grey uppercase tracking-widest mb-3">Curriculum</p>
                       <div className="space-y-2">
                          {w.assignments.map((a, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs font-bold text-brand-dark">
                               <div className="w-1.5 h-1.5 rounded-full bg-brand-light" />
                               {a}
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Replay & PDF */}
                    <div className="grid grid-cols-2 gap-2">
                       {weekContent?.replay_link ? (
                         <a href={weekContent.replay_link} target="_blank" className="flex items-center justify-center gap-2 py-3 bg-brand-sand rounded-xl text-[10px] font-black uppercase text-brand-dark">
                            <PlayCircle className="w-4 h-4" /> Replay
                         </a>
                       ) : (
                         <div className="flex items-center justify-center gap-2 py-3 bg-brand-sand/50 rounded-xl text-[10px] font-black uppercase text-brand-grey">
                            <Clock className="w-4 h-4" /> Replay soon
                         </div>
                       )}

                       <button className="flex items-center justify-center gap-2 py-3 bg-brand-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                          <Download className="w-4 h-4" /> Handout
                       </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}