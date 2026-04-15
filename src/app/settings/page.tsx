"use client";
import { useState, useEffect } from "react";
import { Bell, Shield, ChevronRight, Lock, Loader2, X, Eye, EyeOff, CheckCircle, Moon, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";
import HomeButton from "@/components/HomeButton";

const supabase = createClient();

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${enabled ? "bg-brand-green" : "bg-brand-grey/30"} disabled:opacity-50`}
    >
      <div
        className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${enabled ? "translate-x-6" : "translate-x-0"}`}
      />
    </button>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      setTimeout(onClose, 1500);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">

        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl tracking-wide text-brand-dark">CHANGE PASSWORD</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-sand transition-colors">
            <X className="w-5 h-5 text-brand-grey" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-10 h-10 text-brand-green" />
            <p className="font-bold text-brand-dark text-center">Password updated!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-grey hover:text-brand-dark"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  className="w-full px-4 py-3 pr-12 bg-brand-sand rounded-2xl font-sans text-sm text-brand-dark placeholder-brand-grey border border-transparent focus:border-brand-light focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-grey hover:text-brand-dark"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 bg-brand-dark text-white font-bold text-sm rounded-2xl hover:bg-brand-mid transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [togglingPush, setTogglingPush] = useState(false);
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(false);
  const [togglingCycle, setTogglingCycle] = useState(false);
  const [weekPlannerEnabled, setWeekPlannerEnabled] = useState(true);
  const [togglingWeekPlanner, setTogglingWeekPlanner] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Load prefs on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("notify_push, cycle_tracking_enabled, show_week_planner")
        .eq("id", user.id)
        .single();
      if (data) {
        setPushEnabled(data.notify_push ?? true);
        setCycleTrackingEnabled(data.cycle_tracking_enabled ?? false);
        setWeekPlannerEnabled(data.show_week_planner ?? true);
      }
      setLoadingPrefs(false);
    }
    load();
  }, []);

  async function savePref(field: string, value: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
  }

  async function togglePush() {
    setTogglingPush(true);
    const next = !pushEnabled;
    setPushEnabled(next);
    await savePref("notify_push", next);
    setTogglingPush(false);
  }

  async function toggleCycleTracking() {
    setTogglingCycle(true);
    const next = !cycleTrackingEnabled;
    setCycleTrackingEnabled(next);
    await savePref("cycle_tracking_enabled", next);
    setTogglingCycle(false);
  }

  async function toggleWeekPlanner() {
    setTogglingWeekPlanner(true);
    const next = !weekPlannerEnabled;
    setWeekPlannerEnabled(next);
    await savePref("show_week_planner", next);
    setTogglingWeekPlanner(false);
  }

  return (
    <>
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}

      <main className="min-h-screen bg-brand-sand pb-24 font-sans overflow-x-hidden relative text-brand-dark">

        {/* Header */}
        <header className="bg-linear-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-20 px-6 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(17,12,148,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-mid/30 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <HomeButton />
              <p className="text-brand-light font-bold text-xs uppercase tracking-[0.2em] mb-1 mt-3">Preferences</p>
              <h1 className="font-heading text-4xl tracking-wider">APP SETTINGS</h1>
            </div>
            <AppMenu />
          </div>
        </header>

        <div className="max-w-md mx-auto px-6 -mt-10 space-y-6 relative z-10">

          {/* Notifications */}
          <section className="bg-white p-2 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-brand-sand rounded-xl text-brand-dark">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-dark">Push Notifications</h3>
                  <p className="text-xs text-brand-grey mt-0.5">Daily reminders & updates</p>
                </div>
              </div>
              {loadingPrefs ? (
                <Loader2 className="w-5 h-5 text-brand-grey animate-spin" />
              ) : (
                <Toggle enabled={pushEnabled} onChange={togglePush} disabled={togglingPush} />
              )}
            </div>
          </section>

          {/* Dashboard Widgets */}
          <section className="bg-white p-2 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
            <p className="text-[10px] font-black text-brand-grey uppercase tracking-[0.2em] px-4 pt-3 pb-2">Dashboard Widgets</p>
            <div className="p-4 flex items-center justify-between border-b border-brand-sand">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-brand-sand rounded-xl text-brand-dark">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-dark">Week Plan Strip</h3>
                  <p className="text-xs text-brand-grey mt-0.5">Show your weekly training plan</p>
                </div>
              </div>
              {loadingPrefs ? (
                <Loader2 className="w-5 h-5 text-brand-grey animate-spin" />
              ) : (
                <Toggle enabled={weekPlannerEnabled} onChange={toggleWeekPlanner} disabled={togglingWeekPlanner} />
              )}
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-brand-sand rounded-xl text-brand-dark">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-dark">Cycle Tracker</h3>
                  <p className="text-xs text-brand-grey mt-0.5">Show cycle day on dashboard</p>
                </div>
              </div>
              {loadingPrefs ? (
                <Loader2 className="w-5 h-5 text-brand-grey animate-spin" />
              ) : (
                <Toggle enabled={cycleTrackingEnabled} onChange={toggleCycleTracking} disabled={togglingCycle} />
              )}
            </div>
          </section>

          {/* Account */}
          <section className="bg-white p-2 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full p-4 flex items-center justify-between border-b border-brand-sand hover:bg-brand-sand/50 transition-colors rounded-t-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-brand-dark">Change Password</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-grey" />
            </button>

          </section>

          {/* Support */}
          <section className="bg-white p-2 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
            <button className="w-full p-4 flex items-center justify-between border-b border-brand-sand hover:bg-brand-sand/50 transition-colors rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-brand-grey/10 rounded-xl text-brand-grey">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-brand-dark">Privacy & Terms</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-grey" />
            </button>

            <div className="p-4 flex items-center justify-between text-brand-grey">
              <span className="font-bold text-sm">App Version</span>
              <span className="text-sm">v1.2.4</span>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
