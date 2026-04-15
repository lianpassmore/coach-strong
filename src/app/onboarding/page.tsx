"use client";
import { useState } from "react";
import {
  ArrowRight, ArrowLeft, Target, Sparkles, Shield,
  Eye, Database, Check, Loader2, Dumbbell, Apple,
  Heart, Moon, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Helpers ──────────────────────────────────────────────────────────────────

function ToggleChip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
        selected
          ? "bg-brand-dark text-white border-brand-dark"
          : "bg-brand-sand text-brand-grey border-brand-sand hover:border-brand-light/50"
      }`}
    >
      {label}
    </button>
  );
}

function SleepDot({ level, selected, onClick }: { level: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
        selected
          ? "bg-brand-mid text-white shadow-md scale-110"
          : "bg-brand-sand text-brand-grey hover:bg-brand-grey/20"
      }`}
    >
      {level}
    </button>
  );
}

// ── Form state type ───────────────────────────────────────────────────────────
type FormState = {
  // Step 1
  fullName: string;
  preferredName: string;
  dateOfBirth: string;
  phone: string;
  // Step 2
  goal: string;
  motivationWord: string;
  // Step 3
  trainingExperience: string;
  trainingDaysPerWeek: string;
  equipmentAccess: string[];
  // Step 4
  dietaryRestrictions: string[];
  foodAllergies: string;
  currentSupplements: string;
  // Step 5
  medicalConditions: string;
  currentInjuries: string;
  currentMedications: string;
  // Step 6
  alcoholFrequency: string;
  smokingStatus: string;
  sleepQuality: number | null;
};

const EQUIPMENT_OPTIONS = [
  "Full gym", "Home weights", "Resistance bands", "Kettlebells",
  "Dumbbells only", "Bodyweight only", "Pool / swimming",
];
const DIET_OPTIONS = [
  "No restrictions", "Vegetarian", "Vegan", "Gluten-free",
  "Dairy-free", "Halal", "Kosher", "Low FODMAP",
];
const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const ALCOHOL_OPTIONS = ["None", "Rarely", "Socially (weekends)", "Weekly", "Daily"];
const SMOKING_OPTIONS = ["Non-smoker", "Ex-smoker", "Occasional", "Regular"];

const TOTAL_STEPS = 7;

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasConsented, setHasConsented] = useState(false);

  const [form, setForm] = useState<FormState>({
    fullName: "", preferredName: "", dateOfBirth: "", phone: "",
    goal: "", motivationWord: "",
    trainingExperience: "", trainingDaysPerWeek: "", equipmentAccess: [],
    dietaryRestrictions: [], foodAllergies: "", currentSupplements: "",
    medicalConditions: "", currentInjuries: "", currentMedications: "",
    alcoholFrequency: "", smokingStatus: "", sleepQuality: null,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: "equipmentAccess" | "dietaryRestrictions", value: string) {
    setForm((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  // ── Validation per step ────────────────────────────────────────────────────
  function isStepValid(): boolean {
    switch (step) {
      case 1: return !!form.fullName.trim();
      case 2: return !!form.goal.trim() && !!form.motivationWord.trim();
      case 3: return !!form.trainingExperience;
      case 4: return form.dietaryRestrictions.length > 0;
      case 5: return true; // health fields are optional
      case 6: return !!form.alcoholFrequency && !!form.smokingStatus && form.sleepQuality !== null;
      case 7: return hasConsented;
      default: return false;
    }
  }

  // ── Submit on step 7 ───────────────────────────────────────────────────────
  async function handleSubmit() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Auto-assign cohort: nearest upcoming start date
      const today = new Date().toISOString().slice(0, 10);
      const { data: cohortRows } = await supabase
        .from("cohorts")
        .select("name, start_date")
        .eq("is_active", true)
        .order("start_date");

      let assignedCohort = "";
      let programStartDate: string | null = null;
      if (cohortRows && cohortRows.length > 0) {
        const upcoming = cohortRows.find((c) => c.start_date >= today);
        const picked = upcoming ?? cohortRows[cohortRows.length - 1];
        assignedCohort = picked.name;
        programStartDate = picked.start_date;
      }

      // Update core profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: form.fullName.trim(),
        preferred_name: form.preferredName.trim() || form.fullName.trim().split(" ")[0],
        cohort: assignedCohort,
        goal: form.goal.trim(),
        motivation_word: form.motivationWord.trim(),
        current_week: 0,
        program_phase: "discovery_pending",
        program_start_date: programStartDate,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      // Save detailed onboarding responses
      const { error: respError } = await supabase.from("onboarding_responses").upsert({
        user_id: user.id,
        date_of_birth: form.dateOfBirth || null,
        phone: form.phone.trim() || null,
        training_experience: form.trainingExperience,
        training_days_per_week: form.trainingDaysPerWeek ? parseInt(form.trainingDaysPerWeek) : null,
        equipment_access: form.equipmentAccess,
        dietary_restrictions: form.dietaryRestrictions,
        food_allergies: form.foodAllergies.trim() || null,
        current_supplements: form.currentSupplements.trim() || null,
        medical_conditions: form.medicalConditions.trim() || null,
        current_injuries: form.currentInjuries.trim() || null,
        current_medications: form.currentMedications.trim() || null,
        alcohol_frequency: form.alcoholFrequency,
        smoking_status: form.smokingStatus,
        sleep_quality: form.sleepQuality,
        updated_at: new Date().toISOString(),
      });
      if (respError) throw respError;

      router.push("/discovery");
    } catch (err: any) {
      setSaveError(err.message ?? "Could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function nextStep() {
    if (step === TOTAL_STEPS) {
      await handleSubmit();
    } else {
      setStep((prev) => prev + 1);
    }
  }

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-brand-sand font-sans overflow-hidden flex flex-col text-brand-dark relative">

      {/* Header */}
      <header className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-lg relative transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex justify-between items-center mb-6">
          {step > 1 ? (
            <button onClick={prevStep} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
          <span className="font-logo font-bold tracking-widest text-sm">COACH STRONG</span>
          <div className="text-xs font-bold text-brand-light tracking-widest uppercase">
            {step} / {TOTAL_STEPS}
          </div>
        </div>
        <div className="relative z-10 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green transition-all duration-500 ease-out rounded-full"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      {/* Card */}
      <div className="flex-1 max-w-md w-full mx-auto px-6 -mt-16 z-10 relative pb-10">
        <div className="bg-white p-8 rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.05)] border border-white min-h-112 flex flex-col">

          {/* ── STEP 1: Basics ── */}
          {step === 1 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-brand-dark/10 rounded-2xl flex items-center justify-center mb-6 text-brand-dark">
                <User className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">KIA ORA.<br />LET'S GET STARTED.</h2>
              <p className="text-sm text-brand-grey mb-8">Tell us a bit about yourself so we can personalise your 8-week program.</p>
              <div className="space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Full Name *</label>
                  <input type="text" value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">What should Coach Strong call you?</label>
                  <input type="text" value={form.preferredName} onChange={(e) => set("preferredName", e.target.value)}
                    placeholder="e.g. Sarah (leave blank to use first name)"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Date of Birth</label>
                    <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)}
                      className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                      placeholder="+64 21..."
                      className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Goals ── */}
          {step === 2 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-brand-light/10 rounded-2xl flex items-center justify-center mb-6 text-brand-light">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">YOUR NORTH STAR</h2>
              <p className="text-sm text-brand-grey mb-8">What are we aiming for over the next 8 weeks?</p>
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Primary Goal *</label>
                  <textarea rows={3} value={form.goal} onChange={(e) => set("goal", e.target.value)}
                    placeholder="e.g. Rebuild strength and sleep through the night without pain."
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Your Focus Word/s *</label>
                  <div className="relative">
                    <input type="text" value={form.motivationWord} onChange={(e) => set("motivationWord", e.target.value)}
                      placeholder="e.g. Consistency"
                      className="w-full bg-brand-sand pl-12 pr-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-light" />
                  </div>
                  <p className="text-xs text-brand-grey mt-2">A word or mantra that captures who you want to be for the next 8 weeks.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Training ── */}
          {step === 3 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-brand-mid/10 rounded-2xl flex items-center justify-center mb-6 text-brand-mid">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">TRAINING</h2>
              <p className="text-sm text-brand-grey mb-6">So we can match your program to your starting point.</p>
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-3 uppercase tracking-widest">Experience Level *</label>
                  <div className="flex gap-3">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <ToggleChip key={opt} label={opt} selected={form.trainingExperience === opt} onClick={() => set("trainingExperience", opt)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Training Days Per Week</label>
                  <input type="number" min={1} max={7} value={form.trainingDaysPerWeek}
                    onChange={(e) => set("trainingDaysPerWeek", e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-3 uppercase tracking-widest">Equipment Access</label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((opt) => (
                      <ToggleChip key={opt} label={opt} selected={form.equipmentAccess.includes(opt)} onClick={() => toggleArray("equipmentAccess", opt)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Nutrition ── */}
          {step === 4 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-6 text-brand-green">
                <Apple className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">NUTRITION</h2>
              <p className="text-sm text-brand-grey mb-6">Helps Eske tailor your nutrition guidance.</p>
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-3 uppercase tracking-widest">Dietary Restrictions *</label>
                  <div className="flex flex-wrap gap-2">
                    {DIET_OPTIONS.map((opt) => (
                      <ToggleChip key={opt} label={opt} selected={form.dietaryRestrictions.includes(opt)} onClick={() => {
                        if (opt === "No restrictions") {
                          set("dietaryRestrictions", ["No restrictions"]);
                        } else {
                          const next = form.dietaryRestrictions.filter((v) => v !== "No restrictions");
                          setForm((prev) => ({
                            ...prev,
                            dietaryRestrictions: next.includes(opt) ? next.filter((v) => v !== opt) : [...next, opt],
                          }));
                        }
                      }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Food Allergies</label>
                  <input type="text" value={form.foodAllergies} onChange={(e) => set("foodAllergies", e.target.value)}
                    placeholder="e.g. Nuts, shellfish (leave blank if none)"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Current Supplements</label>
                  <input type="text" value={form.currentSupplements} onChange={(e) => set("currentSupplements", e.target.value)}
                    placeholder="e.g. Magnesium, vitamin D (leave blank if none)"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Health Screening ── */}
          {step === 5 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6 text-red-400">
                <Heart className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">HEALTH SCREENING</h2>
              <p className="text-sm text-brand-grey mb-6">This is confidential and helps Eske keep you safe. Leave blank if nothing applies.</p>
              <div className="space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Medical Conditions</label>
                  <textarea rows={2} value={form.medicalConditions} onChange={(e) => set("medicalConditions", e.target.value)}
                    placeholder="e.g. PCOS, hypothyroidism, high blood pressure"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Current Injuries</label>
                  <textarea rows={2} value={form.currentInjuries} onChange={(e) => set("currentInjuries", e.target.value)}
                    placeholder="e.g. Lower back pain, knee injury"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-2 uppercase tracking-widest">Current Medications</label>
                  <textarea rows={2} value={form.currentMedications} onChange={(e) => set("currentMedications", e.target.value)}
                    placeholder="e.g. HRT, antidepressants"
                    className="w-full bg-brand-sand px-4 py-4 rounded-2xl text-brand-dark font-bold text-sm outline-none border-2 border-transparent focus:border-brand-light/50 transition-colors resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 6: Lifestyle ── */}
          {step === 6 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-brand-light/10 rounded-2xl flex items-center justify-center mb-6 text-brand-light">
                <Moon className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">LIFESTYLE</h2>
              <p className="text-sm text-brand-grey mb-6">Helps Coach Strong understand your baseline and support you holistically.</p>
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-3 uppercase tracking-widest">Alcohol Consumption *</label>
                  <div className="flex flex-wrap gap-2">
                    {ALCOHOL_OPTIONS.map((opt) => (
                      <ToggleChip key={opt} label={opt} selected={form.alcoholFrequency === opt} onClick={() => set("alcoholFrequency", opt)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-3 uppercase tracking-widest">Smoking Status *</label>
                  <div className="flex flex-wrap gap-2">
                    {SMOKING_OPTIONS.map((opt) => (
                      <ToggleChip key={opt} label={opt} selected={form.smokingStatus === opt} onClick={() => set("smokingStatus", opt)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-grey mb-3 uppercase tracking-widest">Sleep Quality (1 = poor, 5 = excellent) *</label>
                  <div className="flex justify-between gap-2 max-w-sm">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SleepDot key={level} level={level} selected={form.sleepQuality === level} onClick={() => set("sleepQuality", level)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 7: Consent ── */}
          {step === 7 && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-12 h-12 bg-brand-mid/10 rounded-2xl flex items-center justify-center mb-6 text-brand-mid">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-4xl tracking-wide mb-2 text-brand-dark">DATA & PRIVACY</h2>
              <p className="text-sm text-brand-grey mb-6">Before we begin, please review how we keep your data safe.</p>
              <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
                <div className="flex gap-3">
                  <Eye className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-brand-dark">Access & Usage</h4>
                    <p className="text-xs text-brand-grey leading-relaxed mt-1">Your data is accessible only by Eske and our technical partner, Dreamstorm. It is used to personalise your coaching and strictly anonymised to improve our programs or for promotional insights.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Database className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-brand-dark">Storage & Transcripts</h4>
                    <p className="text-xs text-brand-grey leading-relaxed mt-1">Data is held in secure Asia Pacific Cloud storage. Voice transcripts are stored separately and anonymously with our AI provider (ElevenLabs) for a minimum of 3 years.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-brand-dark">Your Control</h4>
                    <p className="text-xs text-brand-grey leading-relaxed mt-1">You may request deletion of your app data at any time. Anonymised AI transcripts will remain securely archived.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHasConsented(!hasConsented)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                  hasConsented
                    ? "border-brand-green bg-brand-green/5"
                    : "border-brand-sand bg-brand-sand/50 hover:border-brand-light/50"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  hasConsented ? "bg-brand-green text-white" : "bg-white border-2 border-brand-grey/30 text-transparent"
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-brand-dark leading-tight">
                  I consent to these terms and the use of my transcripts for AI coaching.
                </span>
              </button>
              {saveError && (
                <p className="mt-3 text-xs font-bold text-red-500 text-center">{saveError}</p>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-6 mt-auto">
            <button
              onClick={nextStep}
              disabled={isSaving || !isStepValid()}
              className="w-full bg-brand-dark text-white font-bold text-sm tracking-widest uppercase py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#1a15a3] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-dark/20"
            >
              {isSaving ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Saving…</>
              ) : step === TOTAL_STEPS ? (
                <><Check className="w-5 h-5" />Complete &amp; Continue</>
              ) : (
                <>Continue<ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
