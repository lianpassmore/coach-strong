"use client";
import { useState } from "react";
import {
  ArrowRight, ArrowLeft, Target, Sparkles, Shield,
  Check, Loader2, Dumbbell, Heart, Moon, User,
  Sun, BookOpen, CalendarDays
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EXPERIENCE = ["Beginner", "Intermediate", "Advanced"];
const ALCOHOL = ["None", "Rarely", "Socially", "Daily"];

const MODULES = [
  { key: "module_morning_intention", Icon: Sun,          label: "Daily Intention",    desc: "Set a morning focus each day" },
  { key: "module_evening_prep",       Icon: Moon,         label: "Evening Prep",        desc: "End-of-day checklist for tomorrow" },
  { key: "show_week_planner",         Icon: CalendarDays, label: "Weekly Planner",      desc: "Visual 7-day training schedule" },
  { key: "cycle_tracking_enabled",    Icon: Heart,        label: "Cycle Tracker",       desc: "Sync coaching with your cycle" },
  { key: "module_journal",            Icon: BookOpen,     label: "Journal Prompts",     desc: "Capture insights & reflections" },
  { key: "module_weekly_reflection",  Icon: Sparkles,     label: "Weekly Reflection",   desc: "Friday end-of-week review prompt" },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];
type ModuleState = Record<ModuleKey, boolean>;

const DEFAULT_MODULES: ModuleState = {
  module_morning_intention: false,
  module_evening_prep: false,
  show_week_planner: false,
  cycle_tracking_enabled: false,
  module_journal: false,
  module_weekly_reflection: false,
};

const TOTAL_STEPS = 7;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [modules, setModules] = useState<ModuleState>(DEFAULT_MODULES);

  const [form, setForm] = useState({
    fullName: "", preferredName: "", goal: "", motivationWord: "",
    trainingExperience: "", trainingDays: "3",
    sleepQuality: 3, alcohol: "", smoking: ""
  });

  const updateForm = (key: string, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleModule = (key: ModuleKey) => {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  async function handleComplete() {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        ...(form.fullName     && { full_name:       form.fullName }),
        ...(form.preferredName && { preferred_name: form.preferredName }),
        ...(form.goal         && { goal:            form.goal }),
        ...(form.motivationWord && { motivation_word: form.motivationWord }),
        ...modules,
      }).eq("id", user.id);
    }
    router.push("/discovery");
  }

  const nextStep = () => step < TOTAL_STEPS ? setStep(step + 1) : handleComplete();
  const prevStep = () => setStep(Math.max(1, step - 1));

  const isFinalStep = step === TOTAL_STEPS;
  const isNextDisabled = isSaving || (step === 6 && !hasConsented);

  return (
    <main className="min-h-screen bg-brand-sand pb-24 text-brand-dark overflow-x-hidden flex flex-col">

      {/* HEADER */}
      <header className="bg-brand-dark text-white pt-12 pb-14 px-6 rounded-b-[2.5rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-mid/10 rounded-full blur-[60px]" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
             <button onClick={prevStep} className={`p-2 bg-white/5 rounded-full ${step === 1 ? 'opacity-0' : ''}`}>
               <ArrowLeft className="w-5 h-5 text-white" />
             </button>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-light">
               {step < TOTAL_STEPS ? `Calibration: Step ${step}/6` : "Your Dashboard"}
             </p>
             <div className="w-9" />
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
             <div
               className="h-full bg-brand-green transition-all duration-500"
               style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
             />
          </div>
        </div>
      </header>

      {/* CONTENT CARD */}
      <div className="max-w-md mx-auto px-5 -mt-6 space-y-6 relative z-10 flex-1 w-full">
        <div className={`bg-white rounded-[2.5rem] p-8 shadow-xl border border-brand-sand flex flex-col ${step < TOTAL_STEPS ? 'min-h-112' : ''}`}>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-dark/20">
                <User className="w-6 h-6 text-brand-green" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-2">WHO ARE WE COACHING?</h2>
              <p className="text-xs text-brand-grey mb-8">Let&apos;s start with the basics to personalize your experience.</p>

              <div className="space-y-4">
                <Input label="Full Name" value={form.fullName} onChange={(v) => updateForm('fullName', v)} placeholder="e.g. Sarah Johnson" />
                <Input label="Preferred Name" value={form.preferredName} onChange={(v) => updateForm('preferredName', v)} placeholder="What should Coach Strong call you?" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-brand-light" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-2">YOUR NORTH STAR</h2>
              <p className="text-xs text-brand-grey mb-8">This defines every workout and nutrition choice Coach Strong makes for you.</p>

              <div className="space-y-4">
                <textarea
                  className="w-full h-32 p-4 bg-brand-sand rounded-2xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light resize-none"
                  placeholder="Primary goal (e.g. Rebuild strength and sleep pain-free)"
                  value={form.goal}
                  onChange={(e) => updateForm('goal', e.target.value)}
                />
                <div className="relative">
                   <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-light" />
                   <input
                     className="w-full pl-12 pr-4 py-4 bg-brand-sand rounded-2xl text-sm font-bold border-none"
                     placeholder="Focus Word (e.g. Consistency)"
                     value={form.motivationWord}
                     onChange={(e) => updateForm('motivationWord', e.target.value)}
                   />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <Dumbbell className="w-6 h-6 text-brand-green" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-2">TRAINING LEVEL</h2>
              <p className="text-[10px] font-bold text-brand-grey uppercase tracking-widest mb-6">Experience Level</p>
              <div className="grid grid-cols-1 gap-2 mb-8">
                {EXPERIENCE.map(opt => (
                  <Chip key={opt} label={opt} active={form.trainingExperience === opt} onClick={() => updateForm('trainingExperience', opt)} />
                ))}
              </div>
              <p className="text-[10px] font-bold text-brand-grey uppercase tracking-widest mb-2">Days per week</p>
              <input type="range" min="1" max="7" value={form.trainingDays} onChange={(e) => updateForm('trainingDays', e.target.value)} className="w-full accent-brand-dark" />
              <div className="flex justify-between mt-2 text-xs font-bold">{form.trainingDays} Days</div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <Moon className="w-6 h-6 text-brand-light" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-2">BIO-MARKERS</h2>
              <div className="space-y-6">
                <div>
                   <p className="text-[10px] font-bold text-brand-grey uppercase tracking-widest mb-3">Sleep Quality (1-5)</p>
                   <div className="flex justify-between">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" onClick={() => updateForm('sleepQuality', n)} className={`w-10 h-10 rounded-full font-bold ${form.sleepQuality === n ? 'bg-brand-dark text-white' : 'bg-brand-sand'}`}>{n}</button>
                      ))}
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-brand-grey uppercase tracking-widest mb-3">Alcohol Frequency</p>
                   <div className="flex flex-wrap gap-2">
                      {ALCOHOL.map(opt => (
                        <Chip key={opt} label={opt} active={form.alcohol === opt} onClick={() => updateForm('alcohol', opt)} />
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-2">HEALTH STATUS</h2>
              <p className="text-xs text-brand-grey mb-6">Confidential data to ensure Coach Strong keeps you safe.</p>
              <textarea
                className="w-full h-48 p-4 bg-brand-sand rounded-2xl text-sm font-bold border-none resize-none"
                placeholder="Injuries, medications, or medical conditions..."
              />
            </div>
          )}

          {step === 6 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-2">TRUST & PRIVACY</h2>
              <div className="space-y-4 mb-8">
                 <p className="text-xs text-brand-grey leading-relaxed">Your data is stored in secure Asia-Pacific cloud vaults.</p>
                 <button
                  type="button"
                  onClick={() => setHasConsented(!hasConsented)}
                  className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${hasConsented ? 'border-brand-green bg-brand-green/5' : 'border-brand-sand'}`}
                 >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasConsented ? 'bg-brand-green text-white' : 'border-2 border-brand-sand'}`}>
                      {hasConsented && <Check className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-bold text-left">I consent to AI-powered coaching.</span>
                 </button>
              </div>
            </div>
          )}

          {/* STEP 7: Module selection */}
          {step === 7 && (
            <div className="animate-in fade-in slide-in-from-right-4 flex-1 flex flex-col">
              <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-dark/20">
                <Sparkles className="w-6 h-6 text-brand-green" />
              </div>
              <h2 className="font-heading text-3xl tracking-wide mb-1">YOUR DASHBOARD</h2>
              <p className="text-xs text-brand-grey mb-6 leading-relaxed">
                Choose what you&apos;d like to see. You can change this anytime in Settings.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-2">
                {MODULES.map(({ key, Icon, label, desc }) => {
                  const active = modules[key as ModuleKey];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleModule(key as ModuleKey)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                        active
                          ? "border-brand-dark bg-brand-dark text-white"
                          : "border-brand-sand bg-brand-sand/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-2 ${active ? "text-brand-green" : "text-brand-grey"}`} />
                      <p className={`text-[10px] font-black uppercase tracking-wide leading-tight mb-1 ${active ? "text-white" : "text-brand-dark"}`}>
                        {label}
                      </p>
                      <p className={`text-[10px] leading-snug ${active ? "text-white/60" : "text-brand-grey"}`}>
                        {desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-brand-grey text-center mt-3">
                None selected? No problem — your core four are always on.
              </p>
            </div>
          )}

          {/* NEXT BUTTON */}
          <div className="mt-auto pt-8">
             <button
               onClick={nextStep}
               disabled={isNextDisabled}
               className="w-full py-5 bg-brand-dark text-white rounded-4xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
             >
               {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : isFinalStep ? "Initialize My Plan" : "Continue"}
               {!isSaving && <ArrowRight className="w-5 h-5" />}
             </button>
          </div>
        </div>
      </div>
    </main>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

function Input({ label, value, onChange, placeholder }: InputProps) {
  return (
    <div>
      <p className="text-[10px] font-black text-brand-grey uppercase tracking-widest mb-2 px-1">{label}</p>
      <input
        className="w-full px-5 py-4 bg-brand-sand rounded-2xl text-sm font-bold border-none focus:ring-1 focus:ring-brand-light"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 rounded-xl font-bold text-xs transition-all ${active ? 'bg-brand-dark text-white shadow-lg scale-[1.02]' : 'bg-brand-sand text-brand-grey'}`}
    >
      {label}
    </button>
  );
}
