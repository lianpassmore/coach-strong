"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, AlertTriangle, Activity, ChevronDown, ChevronUp,
  Clock, CheckCircle, BarChart2, Shield, Loader2, RefreshCw, MessageSquare,
  Plus, Pencil, Trash2, X, Save, FileText, Upload,
  CheckCircle2, Download, KeyRound, Mail, Link2, Calendar, ExternalLink, Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type TopicRow    = { topic: string; count: number };
type Participant = {
  id: string; name: string; email: string; week: number;
  cohort: string; phase: string; lastSeenDays: number; energy: number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGES = [
  { label: "Onboarding", weeks: null,   color: "bg-brand-grey/20 text-brand-grey border-brand-grey/30" },
  { label: "Week 1–2",   weeks: [1, 2], color: "bg-brand-light/15 text-brand-light border-brand-light/30" },
  { label: "Week 3–4",   weeks: [3, 4], color: "bg-brand-mid/15 text-brand-mid border-brand-mid/30" },
  { label: "Week 5–6",   weeks: [5, 6], color: "bg-brand-dark/10 text-brand-dark border-brand-dark/20" },
  { label: "Week 7–8",   weeks: [7, 8], color: "bg-brand-green/20 text-brand-mid border-brand-green/30" },
];

function statusMeta(days: number) {
  if (days === 0) return { label: "Active today", dot: "bg-brand-green", text: "text-brand-mid"  };
  if (days === 1) return { label: "Yesterday",    dot: "bg-amber-400",   text: "text-amber-600" };
  if (days <= 3)  return { label: `${days}d ago`, dot: "bg-amber-400",   text: "text-amber-600" };
  return               { label: `${days}d ago`, dot: "bg-red-400",    text: "text-red-600"  };
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ id, name, size = "w-9 h-9", textSize = "text-xs" }: { id: string; name: string; size?: string; textSize?: string }) {
  const [imgError, setImgError] = useState(false);
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile_pictures/${id}/avatar`;
  if (!imgError) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setImgError(true)}
        className={`${size} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div className={`${size} rounded-full bg-brand-dark/10 flex items-center justify-center ${textSize} font-black text-brand-dark shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "participants" | "cohorts" | "topics" | "handouts" | "content" | "alerts" | "settings";

type Incident = {
  id: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_reasons: { hard_triggers: string[]; soft_triggers: string[]; planning_words: string[] };
  trigger_type: string | null;
  user_message: string;
  full_transcript: { role: string; message: string }[] | null;
  status: string;
  researcher_notified_at: string | null;
  created_at: string;
  participant_name: string;
  participant_email: string;
};

type EngAlert = {
  id: string;
  user_id: string;
  type: 'no_engagement' | 'low_energy';
  message: string;
  severity: 'medium' | 'high';
  read: boolean;
  resolved: boolean;
  created_at: string;
  participant_name: string;
};

type HandoutStatus = {
  week: number;
  theme: string;
  exists: boolean;
  uploading: boolean;
  url: string | null;
};

const WEEK_THEMES = [
  "Foundation & Identity", "Rest & Recovery", "Movement & Momentum",
  "Nutrition & Fuel", "Mental Toughness", "Relationships & Support",
  "Habits & Routines", "Your Future Self",
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");

  // Participants + topics state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [topics, setTopics]             = useState<TopicRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  // Handouts state
  const [handouts, setHandouts] = useState<HandoutStatus[]>(
    WEEK_THEMES.map((theme, i) => ({ week: i + 1, theme, exists: false, uploading: false, url: null }))
  );
  const [handoutsLoaded, setHandoutsLoaded] = useState(false);
  const [onboardingPackExists, setOnboardingPackExists] = useState(false);
  const [onboardingPackUploading, setOnboardingPackUploading] = useState(false);
  const supabase = createClient();

  // Incidents / alerts state
  const [incidents, setIncidents]           = useState<Incident[]>([]);
  const [incidentsLoaded, setIncidentsLoaded] = useState(false);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId]   = useState<string | null>(null);
  const [resetDoneId, setResetDoneId]           = useState<string | null>(null);

  // Engagement alerts state
  const [engAlerts, setEngAlerts]             = useState<EngAlert[]>([]);
  const [engAlertsLoaded, setEngAlertsLoaded] = useState(false);
  const [runningCheck, setRunningCheck]       = useState(false);

  // Cohorts state
  type Cohort = { id: string; name: string; start_date: string; is_active: boolean; whatsapp_link?: string | null; zoom_link?: string | null };
  const [cohorts, setCohorts]           = useState<Cohort[]>([]);
  const [cohortsLoaded, setCohortsLoaded] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortDate, setNewCohortDate] = useState('');
  const [savingCohort, setSavingCohort]   = useState(false);
  const [cohortError, setCohortError]     = useState<string | null>(null);
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [editCohortName, setEditCohortName] = useState('');
  const [editCohortDate, setEditCohortDate] = useState('');
  const [editCohortZoom, setEditCohortZoom] = useState('');

  // Cohort membership state
  const [assigningParticipantId, setAssigningParticipantId] = useState<string | null>(null);
  const [cohortMembershipError, setCohortMembershipError] = useState<string | null>(null);
  const [pendingCohortMove, setPendingCohortMove] = useState<Record<string, string>>({});

  // Overview stats state
  type OverviewStats = {
    totalParticipants: number;
    discoveryDone: number;
    checkInsThisWeek: number;
    avgEnergy7d: number | null;
    conversationsThisWeek: number;
    voiceMinutesThisWeek: number;
  };
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Program settings state
  type ProgramSettings = { no_activity_days: number; low_energy_streak: number; default_weekly_cap_minutes: number };
  const SETTINGS_DEFAULTS: ProgramSettings = { no_activity_days: 5, low_energy_streak: 3, default_weekly_cap_minutes: 120 };
  const [settings, setSettings]           = useState<ProgramSettings>(SETTINGS_DEFAULTS);
  const [settingsDraft, setSettingsDraft] = useState<ProgramSettings>(SETTINGS_DEFAULTS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved]   = useState(false);

  // Content tab state
  const [contentCohortId, setContentCohortId]   = useState('');
  const [contentWeek, setContentWeek]           = useState(1);
  const [weeklyLinks, setWeeklyLinks]           = useState<Record<number, { zoom_link: string; replay_link: string; session_topic: string; session_prep_text: string; replay_timestamps: { label: string; seconds: number }[] }>>({});
  const [whatsappLink, setWhatsappLink]         = useState('');
  const [contentLoaded, setContentLoaded]       = useState(false);
  const [savingWeek, setSavingWeek]             = useState<number | null>(null);
  const [weekSaved, setWeekSaved]               = useState<number | null>(null);
  const [savingWhatsapp, setSavingWhatsapp]     = useState(false);
  const [whatsappSaved, setWhatsappSaved]       = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/admin/participants'),
        fetch('/api/admin/topics'),
      ]);
      if (!pRes.ok) {
        const body = await pRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${pRes.status}`);
      }
      const { participants } = await pRes.json();
      setParticipants(participants);
      if (tRes.ok) {
        const { topics } = await tRes.json();
        setTopics(topics ?? []);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

useEffect(() => { fetchDashboard(); }, []);
useEffect(() => { if (tab === "handouts" && !handoutsLoaded) fetchHandouts(); }, [tab]);
  useEffect(() => { if (tab === "alerts" && !incidentsLoaded) fetchIncidents(); }, [tab]);
  useEffect(() => { if (tab === "alerts" && !engAlertsLoaded) fetchEngAlerts(); }, [tab]);
  useEffect(() => { if (tab === "participants" && !cohortsLoaded) fetchCohorts(); }, [tab]);
  useEffect(() => { if (tab === "cohorts" && !cohortsLoaded) fetchCohorts(); }, [tab]);
  useEffect(() => { if (tab === "content" && !cohortsLoaded) fetchCohorts(); }, [tab]);
  useEffect(() => {
    if (tab === "overview") {
      fetchOverview();
      if (!cohortsLoaded) fetchCohorts();
      if (!engAlertsLoaded) fetchEngAlerts();
      if (!incidentsLoaded) fetchIncidents();
    }
  }, [tab]);
  useEffect(() => { if (tab === "settings" && !settingsLoaded) fetchSettings(); }, [tab]);

  async function fetchCohorts() {
    const res = await fetch('/api/admin/cohorts');
    if (res.ok) {
      const { cohorts } = await res.json();
      setCohorts(cohorts ?? []);
    }
    setCohortsLoaded(true);
  }

  async function addCohort() {
    if (!newCohortName.trim() || !newCohortDate) return;
    setSavingCohort(true);
    setCohortError(null);
    const res = await fetch('/api/admin/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCohortName.trim(), start_date: newCohortDate }),
    });
    if (res.ok) {
      const { cohort } = await res.json();
      setCohorts(prev => [...prev, cohort].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setNewCohortName('');
      setNewCohortDate('');
    } else {
      const body = await res.json().catch(() => ({}));
      setCohortError(body.error ?? `Failed to save cohort (${res.status})`);
    }
    setSavingCohort(false);
  }

  async function fetchEngAlerts() {
    const res = await fetch('/api/admin/engagement-alerts');
    if (res.ok) {
      const { alerts } = await res.json();
      setEngAlerts(alerts ?? []);
    }
    setEngAlertsLoaded(true);
  }

  async function resolveEngAlert(id: string) {
    await fetch('/api/admin/engagement-alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolved: true }),
    });
    setEngAlerts(prev => prev.filter(a => a.id !== id));
  }

  async function runEngagementCheck() {
    setRunningCheck(true);
    const res = await fetch('/api/admin/engagement-alerts', { method: 'POST' });
    setRunningCheck(false);
    if (res.ok) {
      const { created } = await res.json();
      if (created > 0) {
        setEngAlertsLoaded(false);
        fetchEngAlerts();
      }
    }
  }

  async function fetchWeeklyContent(cohortId: string) {
    setContentLoaded(false);
    const res = await fetch(`/api/admin/weekly-content?cohort_id=${cohortId}`);
    if (res.ok) {
      const { weeks, whatsapp_link } = await res.json();
      const map: Record<number, { zoom_link: string; replay_link: string; session_topic: string; session_prep_text: string; replay_timestamps: { label: string; seconds: number }[] }> = {};
      for (let w = 1; w <= 8; w++) {
        const found = (weeks as { week_number: number; zoom_link: string | null; replay_link: string | null; session_topic: string | null; session_prep_text: string | null; replay_timestamps: { label: string; seconds: number }[] | null }[])
          .find(x => x.week_number === w);
        map[w] = {
          zoom_link: found?.zoom_link ?? '',
          replay_link: found?.replay_link ?? '',
          session_topic: found?.session_topic ?? '',
          session_prep_text: found?.session_prep_text ?? '',
          replay_timestamps: found?.replay_timestamps ?? [],
        };
      }
      setWeeklyLinks(map);
      setWhatsappLink(whatsapp_link ?? '');
    }
    setContentLoaded(true);
  }

  async function saveWeekLinks(week: number) {
    if (!contentCohortId) return;
    setSavingWeek(week);
    const links = weeklyLinks[week] ?? { zoom_link: '', replay_link: '', session_topic: '', session_prep_text: '', replay_timestamps: [] };
    await fetch('/api/admin/weekly-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohort_id: contentCohortId,
        week_number: week,
        zoom_link: links.zoom_link || null,
        replay_link: links.replay_link || null,
        session_topic: links.session_topic || null,
        session_prep_text: links.session_prep_text || null,
        replay_timestamps: links.replay_timestamps.length > 0 ? links.replay_timestamps : null,
      }),
    });
    setSavingWeek(null);
    setWeekSaved(week);
    setTimeout(() => setWeekSaved(null), 2000);
  }

  async function saveWhatsapp() {
    if (!contentCohortId) return;
    setSavingWhatsapp(true);
    await fetch('/api/admin/weekly-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: contentCohortId, whatsapp_link: whatsappLink || null }),
    });
    setSavingWhatsapp(false);
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 2000);
  }

  async function deleteCohort(id: string) {
    await fetch(`/api/admin/cohorts/${id}`, { method: 'DELETE' });
    setCohorts(prev => prev.filter(c => c.id !== id));
  }

  async function saveCohortEdit(id: string) {
    setSavingCohort(true);
    const res = await fetch(`/api/admin/cohorts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editCohortName.trim(), start_date: editCohortDate, zoom_link: editCohortZoom.trim() || null }),
    });
    if (res.ok) {
      const { cohort } = await res.json();
      setCohorts(prev => prev.map(c => c.id === id ? cohort : c).sort((a, b) => a.start_date.localeCompare(b.start_date)));
    }
    setEditingCohortId(null);
    setSavingCohort(false);
  }

  async function assignParticipantToCohort(participantId: string, cohortName: string | null) {
    setAssigningParticipantId(participantId);
    setCohortMembershipError(null);
    const res = await fetch(`/api/admin/participant/${participantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort: cohortName }),
    });
    if (res.ok) {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, cohort: cohortName ?? '' } : p));
      setPendingCohortMove(prev => { const next = { ...prev }; delete next[participantId]; return next; });
    } else {
      const body = await res.json().catch(() => ({}));
      setCohortMembershipError(body.error ?? 'Failed to update cohort');
    }
    setAssigningParticipantId(null);
  }

  async function fetchIncidents() {
    const res = await fetch('/api/admin/incidents');
    if (res.ok) {
      const { incidents } = await res.json();
      setIncidents(incidents ?? []);
    }
    setIncidentsLoaded(true);
  }

  async function handlePasswordReset(participantId: string, email: string) {
    if (!confirm(`Send a password reset email to ${email}?`)) return;
    setResettingUserId(participantId);
    const res = await fetch(`/api/admin/users/${participantId}/reset-password`, { method: 'POST' });
    setResettingUserId(null);
    if (res.ok) {
      setResetDoneId(participantId);
      setTimeout(() => setResetDoneId(null), 3000);
    }
  }

  async function markIncidentReviewed(id: string) {
    await fetch('/api/admin/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'reviewed' }),
    });
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'reviewed' } : i));
  }

  async function fetchHandouts() {
    const { data: files } = await supabase.storage.from('handouts').list('', { limit: 100 });
    const existingFiles = new Set((files ?? []).map(f => f.name));
    setHandouts(prev => prev.map(h => ({
      ...h,
      exists: existingFiles.has(`week-${h.week}.pdf`),
    })));
    setOnboardingPackExists(existingFiles.has('onboarding-pack.pdf'));
    setHandoutsLoaded(true);
  }

  async function handleOnboardingPackUpload(file: File) {
    setOnboardingPackUploading(true);
    const { error } = await supabase.storage
      .from('handouts')
      .upload('onboarding-pack.pdf', file, { upsert: true, contentType: 'application/pdf' });
    setOnboardingPackUploading(false);
    if (!error) setOnboardingPackExists(true);
  }

  async function handleOnboardingPackDelete() {
    if (!confirm('Remove the Onboarding Pack? Participants will no longer be able to download it.')) return;
    await supabase.storage.from('handouts').remove(['onboarding-pack.pdf']);
    setOnboardingPackExists(false);
  }

  async function getOnboardingPackUrl() {
    const { data } = await supabase.storage
      .from('handouts')
      .createSignedUrl('onboarding-pack.pdf', 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function handleHandoutUpload(week: number, file: File) {
    setHandouts(prev => prev.map(h => h.week === week ? { ...h, uploading: true } : h));
    const { error } = await supabase.storage
      .from('handouts')
      .upload(`week-${week}.pdf`, file, { upsert: true, contentType: 'application/pdf' });
    setHandouts(prev => prev.map(h =>
      h.week === week ? { ...h, uploading: false, exists: !error } : h
    ));
  }

  async function handleHandoutDelete(week: number) {
    if (!confirm(`Remove Week ${week} handout?`)) return;
    await supabase.storage.from('handouts').remove([`week-${week}.pdf`]);
    setHandouts(prev => prev.map(h => h.week === week ? { ...h, exists: false, url: null } : h));
  }

  async function getHandoutUrl(week: number) {
    const { data } = await supabase.storage
      .from('handouts')
      .createSignedUrl(`week-${week}.pdf`, 60 * 10); // 10 min
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  async function fetchOverview() {
    setOverviewLoading(true);
    const res = await fetch('/api/admin/overview');
    if (res.ok) setOverviewStats(await res.json());
    setOverviewLoading(false);
  }

  async function fetchSettings() {
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const { settings: s } = await res.json();
      setSettings(s);
      setSettingsDraft(s);
    }
    setSettingsLoaded(true);
  }

  async function saveSettings() {
    setSavingSettings(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      const { settings: s } = await res.json();
      setSettings(s);
      setSettingsDraft(s);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    }
    setSavingSettings(false);
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const stageParticipants = (stageIdx: number) => {
    const stage = STAGES[stageIdx];
    if (!stage.weeks) return participants.filter(p => p.phase === 'onboarding');
    return participants.filter(p => stage.weeks!.includes(p.week));
  };

  const activeToday = participants.filter(p => p.lastSeenDays === 0).length;
  const atRisk      = participants.filter(p => p.lastSeenDays >= 4).length;
  const energyRows  = participants.filter(p => p.energy !== null);
  const avgEnergy   = energyRows.length > 0
    ? (energyRows.reduce((s, p) => s + (p.energy ?? 0), 0) / energyRows.length).toFixed(1)
    : '–';
  const sortedByLastSeen = [...participants].sort((a, b) => b.lastSeenDays - a.lastSeenDays);

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-brand-sand flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-500 font-bold text-center">{error}</p>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-2xl font-bold text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-brand-sand font-sans text-brand-dark">

        {/* Header */}
        <header className="bg-linear-to-r from-brand-dark to-[#1a15a3] text-white px-8 py-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
              <Shield className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <p className="text-brand-green font-bold text-[10px] uppercase tracking-[0.2em]">Coach View</p>
              <h1 className="font-heading text-3xl tracking-widest">COACH STRONG</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="p-2 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold tracking-wide"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Participant View</span>
            </Link>
          </div>
        </header>

        {/* Tab bar */}
        <div className="bg-white border-b border-brand-sand sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
            {([
              { id: "overview",     label: "Overview",       icon: <BarChart2 className="w-4 h-4" /> },
              { id: "participants", label: "Participants",   icon: <Users className="w-4 h-4" /> },
              { id: "cohorts",     label: "Cohorts",        icon: <Calendar className="w-4 h-4" /> },
              { id: "topics",      label: "Topics",         icon: <MessageSquare className="w-4 h-4" /> },
{ id: "handouts",     label: "Handouts",       icon: <FileText className="w-4 h-4" /> },
              { id: "content",      label: "Content",        icon: <Calendar className="w-4 h-4" /> },
              {
                id: "alerts",
                label: (() => {
                  const n = incidents.filter(i => i.status === 'pending').length + engAlerts.filter(a => !a.read).length;
                  return `Alerts${n > 0 ? ` (${n})` : ''}`;
                })(),
                icon: <AlertTriangle className="w-4 h-4" />,
              },
              { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "border-brand-dark text-brand-dark"
                    : "border-transparent text-brand-grey hover:text-brand-dark"
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Cohort header */}
              <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="font-heading text-2xl tracking-wide text-brand-dark">
                      {cohorts.length > 0 ? cohorts[cohorts.length - 1].name : "Coach Strong"}
                    </h2>
                    <p className="text-sm text-brand-grey mt-1">{participants.length} participants enrolled</p>
                  </div>
                  <button
                    onClick={fetchOverview}
                    className="p-2 bg-brand-sand rounded-xl hover:bg-brand-grey/20 transition-colors"
                    title="Refresh stats"
                  >
                    <RefreshCw className={`w-4 h-4 text-brand-grey ${overviewLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Participants",
                    value: participants.length.toString(),
                    note: `${participants.filter(p => p.phase !== 'onboarding').length} active in program`,
                  },
                  {
                    label: "Discovery Done",
                    value: overviewStats ? `${overviewStats.discoveryDone} / ${overviewStats.totalParticipants}` : '—',
                    note: overviewStats ? `${overviewStats.totalParticipants - overviewStats.discoveryDone} pending` : 'loading…',
                  },
                  {
                    label: "Check-ins This Week",
                    value: overviewStats ? `${overviewStats.checkInsThisWeek} / ${overviewStats.totalParticipants}` : '—',
                    note: overviewStats
                      ? `${Math.round((overviewStats.checkInsThisWeek / Math.max(overviewStats.totalParticipants, 1)) * 100)}% completed`
                      : 'loading…',
                  },
                  {
                    label: "Avg Energy This Week",
                    value: overviewStats?.avgEnergy7d != null ? `${overviewStats.avgEnergy7d} / 5` : '—',
                    note: 'last 7 days',
                  },
                  {
                    label: "Conversations",
                    value: overviewStats != null ? overviewStats.conversationsThisWeek.toString() : '—',
                    note: 'this week',
                  },
                  {
                    label: "Voice Minutes",
                    value: overviewStats != null ? `${overviewStats.voiceMinutesThisWeek} min` : '—',
                    note: 'this week',
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-white shadow-sm">
                    <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-2">{stat.label}</p>
                    <p className="text-3xl font-black text-brand-dark">{stat.value}</p>
                    <p className="text-xs text-brand-grey mt-1">{stat.note}</p>
                  </div>
                ))}
              </div>

              {/* Alerts banner */}
              {(engAlerts.filter(a => !a.read).length + incidents.filter(i => i.status === 'pending').length) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-bold text-red-700 text-sm">
                        {engAlerts.filter(a => !a.read).length + incidents.filter(i => i.status === 'pending').length} alerts require attention
                      </p>
                      <p className="text-xs text-red-400 mt-0.5">
                        {incidents.filter(i => i.status === 'pending').length > 0 && `${incidents.filter(i => i.status === 'pending').length} crisis · `}
                        {engAlerts.filter(a => !a.read).length > 0 && `${engAlerts.filter(a => !a.read).length} engagement`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTab("alerts")}
                    className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shrink-0"
                  >
                    View alerts
                  </button>
                </div>
              )}

              {/* Participant quick-view */}
              <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light"><Users className="w-5 h-5" /></div>
                  <h2 className="font-heading text-2xl tracking-wide pt-1">PARTICIPANTS</h2>
                </div>
                {participants.length === 0 ? (
                  <p className="text-sm text-brand-grey text-center py-8">No participants enrolled yet.</p>
                ) : (
                  <div className="space-y-1">
                    {sortedByLastSeen.map(p => {
                      const { label, dot, text } = statusMeta(p.lastSeenDays);
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-brand-sand transition-colors">
                          <Avatar id={p.id} name={p.name} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-brand-dark">{p.name}</p>
                            <p className="text-xs text-brand-grey">{p.phase === 'onboarding' ? 'Onboarding' : `Week ${p.week} · ${p.cohort || 'No cohort'}`}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {p.energy !== null && (
                              <div className="w-7 h-7 rounded-lg bg-brand-mid/10 flex items-center justify-center text-xs font-black text-brand-mid">{p.energy}</div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                              <span className={`text-[11px] font-bold ${text}`}>{label}</span>
                            </div>
                            <Link
                              href={`/admin/participant/${p.id}`}
                              className="text-[11px] font-bold text-brand-grey hover:text-brand-dark px-2 py-1 rounded-lg hover:bg-brand-sand transition-colors"
                            >
                              View →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PARTICIPANTS TAB ─────────────────────────────────────────── */}
          {tab === "participants" && (
            <>
              {/* KPI Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Participants", value: participants.length, icon: <Users className="w-5 h-5" />,         color: "text-brand-dark"  },
                  { label: "Active Today",        value: activeToday,         icon: <Activity className="w-5 h-5" />,      color: "text-brand-mid"   },
                  { label: "Avg Energy (7d)",     value: avgEnergy,           icon: <TrendingUp className="w-5 h-5" />,    color: "text-brand-light" },
                  { label: "At Risk",             value: atRisk,              icon: <AlertTriangle className="w-5 h-5" />, color: "text-red-500"     },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-white shadow-sm flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-brand-sand ${stat.color}`}>{stat.icon}</div>
                    <div>
                      <p className="text-2xl font-black text-brand-dark">{stat.value}</p>
                      <p className="text-xs text-brand-grey font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Funnel + Pulse */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-white shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-brand-dark/5 rounded-xl text-brand-dark"><BarChart2 className="w-5 h-5" /></div>
                    <h2 className="font-heading text-2xl tracking-wide pt-1">JOURNEY FUNNEL</h2>
                  </div>
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {STAGES.map((stage, i) => {
                      const count = stageParticipants(i).length;
                      const isSel = selectedStage === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedStage(isSel ? null : i)}
                          className={`flex-1 min-w-25 p-4 rounded-2xl border-2 transition-all text-center ${
                            isSel ? "border-brand-dark bg-brand-dark text-white shadow-lg scale-105" : `${stage.color} hover:opacity-80`
                          }`}
                        >
                          <p className={`text-3xl font-black mb-1 ${isSel ? "text-white" : ""}`}>{count}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${isSel ? "text-white/80" : ""}`}>{stage.label}</p>
                        </button>
                      );
                    })}
                  </div>
                  {selectedStage !== null ? (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <p className="text-xs font-black text-brand-grey uppercase tracking-widest mb-3">{STAGES[selectedStage].label} — Participants</p>
                      {stageParticipants(selectedStage).length === 0 ? (
                        <p className="text-sm text-brand-grey text-center py-6">No participants at this stage yet.</p>
                      ) : stageParticipants(selectedStage).map(p => {
                        const { label, dot } = statusMeta(p.lastSeenDays);
                        return (
                          <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl bg-brand-sand hover:bg-brand-grey/10 transition-colors">
                            <Avatar id={p.id} name={p.name} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{p.name}</p>
                              <p className="text-xs text-brand-grey truncate">{p.email}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                              <span className="text-xs text-brand-grey">{label}</span>
                            </div>
                            {p.energy !== null && (
                              <div className="w-8 h-8 rounded-lg bg-brand-mid/10 flex items-center justify-center text-sm font-black text-brand-mid shrink-0">{p.energy}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-brand-grey text-center py-4">Click a stage above to view participants.</p>
                  )}
                </div>

                <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500"><Clock className="w-5 h-5" /></div>
                    <h2 className="font-heading text-2xl tracking-wide pt-1">PULSE</h2>
                  </div>
                  {participants.length === 0 ? (
                    <p className="text-sm text-brand-grey text-center py-4">No participants yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedByLastSeen.map(p => {
                        const { label, dot, text } = statusMeta(p.lastSeenDays);
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-sand transition-colors group">
                            <Avatar id={p.id} name={p.name} size="w-8 h-8" textSize="text-[10px]" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{p.name.split(" ")[0]}</p>
                              <p className="text-[10px] font-semibold text-brand-grey">{p.phase === "onboarding" ? "Onboarding" : `Week ${p.week}`}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className={`w-1.5 h-1.5 rounded-full ${dot}`}></div>
                              <span className={`text-[11px] font-bold ${text}`}>{label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-brand-sand grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-brand-green font-black text-lg">{participants.filter(p => p.lastSeenDays === 0).length}</p>
                      <p className="text-[9px] text-brand-grey uppercase font-bold tracking-wider">Active</p>
                    </div>
                    <div>
                      <p className="text-amber-500 font-black text-lg">{participants.filter(p => p.lastSeenDays >= 1 && p.lastSeenDays <= 3).length}</p>
                      <p className="text-[9px] text-brand-grey uppercase font-bold tracking-wider">Warning</p>
                    </div>
                    <div>
                      <p className="text-red-500 font-black text-lg">{participants.filter(p => p.lastSeenDays >= 4).length}</p>
                      <p className="text-[9px] text-brand-grey uppercase font-bold tracking-wider">At Risk</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Participants Table */}
              <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light"><CheckCircle className="w-5 h-5" /></div>
                  <h2 className="font-heading text-2xl tracking-wide pt-1">ALL PARTICIPANTS</h2>
                </div>
                {participants.length === 0 ? (
                  <p className="text-sm text-brand-grey text-center py-8">No participants enrolled yet.</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map(p => {
                      const { label, dot, text } = statusMeta(p.lastSeenDays);
                      const isExp = expandedId === p.id;
                      return (
                        <div key={p.id} className="rounded-2xl border border-brand-sand overflow-hidden">
                          <button
                            onClick={() => setExpandedId(isExp ? null : p.id)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-brand-sand/30 transition-colors text-left"
                          >
                            <Avatar id={p.id} name={p.name} size="w-10 h-10" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm">{p.name}</p>
                              <p className="text-xs text-brand-grey truncate">{p.email}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                              <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                              <span className={`text-xs font-semibold ${text}`}>{label}</span>
                            </div>
                            <div className="text-xs font-bold text-brand-grey shrink-0 hidden md:block">
                              {p.phase === 'onboarding' ? 'Onboarding' : `Wk ${p.week}`}
                            </div>
                            {p.energy !== null && (
                              <div className="w-8 h-8 rounded-lg bg-brand-mid/10 flex items-center justify-center text-sm font-black text-brand-mid shrink-0">{p.energy}</div>
                            )}
                            {isExp ? <ChevronUp className="w-4 h-4 text-brand-grey shrink-0" /> : <ChevronDown className="w-4 h-4 text-brand-grey shrink-0" />}
                          </button>
                          {isExp && (
                            <div className="border-t border-brand-sand px-5 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Email</p>
                                <p className="font-semibold text-brand-dark truncate">{p.email}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Cohort</p>
                                <p className="font-semibold text-brand-dark">{p.cohort || '–'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Current Week</p>
                                <p className="font-semibold text-brand-dark">{p.phase === 'onboarding' ? 'Onboarding' : `Week ${p.week}`}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-1">Last Energy</p>
                                <p className="font-semibold text-brand-dark">{p.energy !== null ? `${p.energy}/5` : 'No check-in'}</p>
                              </div>
                              <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2 pt-2 border-t border-brand-sand">
                                <Link
                                  href={`/admin/participant/${p.id}`}
                                  className="flex items-center gap-2 px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-bold hover:bg-brand-mid transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View participant
                                </Link>
                                <button
                                  onClick={() => handlePasswordReset(p.id, p.email)}
                                  disabled={resettingUserId === p.id}
                                  className="flex items-center gap-2 px-4 py-2 bg-brand-sand rounded-xl text-xs font-bold text-brand-dark hover:bg-brand-grey/20 transition-colors disabled:opacity-50"
                                >
                                  {resettingUserId === p.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : resetDoneId === p.id
                                      ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                                      : <KeyRound className="w-3.5 h-3.5" />}
                                  {resetDoneId === p.id ? 'Reset email sent!' : 'Send password reset'}
                                </button>
                                <a
                                  href={`mailto:${p.email}`}
                                  className="flex items-center gap-2 px-4 py-2 bg-brand-sand rounded-xl text-xs font-bold text-brand-dark hover:bg-brand-grey/20 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  Email participant
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </>
          )}

          {/* ── COHORTS TAB ──────────────────────────────────────────────── */}
          {tab === "cohorts" && (
            <div className="space-y-8">

              {/* Cohort Management */}
              <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-green"><Calendar className="w-5 h-5" /></div>
                  <h2 className="font-heading text-2xl tracking-wide pt-1">COHORT DATES</h2>
                </div>
                <p className="text-sm text-brand-grey mb-5">New participants are automatically assigned to the nearest upcoming cohort when they sign up.</p>

                <div className="space-y-2 mb-5">
                  {cohorts.length === 0 && cohortsLoaded && (
                    <p className="text-sm text-brand-grey text-center py-4">No cohorts yet — add one below.</p>
                  )}
                  {cohorts.map(c => (
                    <div key={c.id} className="rounded-2xl bg-brand-sand overflow-hidden">
                      {editingCohortId === c.id ? (
                        <div className="px-4 py-3 space-y-2">
                          <input
                            type="text"
                            value={editCohortName}
                            onChange={e => setEditCohortName(e.target.value)}
                            placeholder="Cohort name"
                            className="w-full px-3 py-2 bg-white rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors font-bold"
                          />
                          <input
                            type="date"
                            value={editCohortDate}
                            onChange={e => setEditCohortDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors"
                          />
                          <input
                            type="url"
                            value={editCohortZoom}
                            onChange={e => setEditCohortZoom(e.target.value)}
                            placeholder="Zoom link (https://zoom.us/j/...)"
                            className="w-full px-3 py-2 bg-white rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors"
                          />
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => saveCohortEdit(c.id)}
                              disabled={savingCohort}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50"
                            >
                              {savingCohort ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCohortId(null)}
                              className="px-4 py-2 bg-white text-brand-grey text-xs font-bold rounded-xl hover:text-brand-dark transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="font-bold text-sm text-brand-dark">{c.name}</p>
                            <p className="text-xs text-brand-grey mt-0.5">{new Date(c.start_date + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            {c.zoom_link ? (
                              <p className="text-[10px] text-brand-light font-bold mt-1">Zoom set ✓</p>
                            ) : (
                              <p className="text-[10px] text-brand-grey mt-1">No Zoom link</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingCohortId(c.id); setEditCohortName(c.name); setEditCohortDate(c.start_date); setEditCohortZoom(c.zoom_link ?? ''); }}
                              className="p-2 text-brand-grey hover:text-brand-dark transition-colors rounded-xl hover:bg-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCohort(c.id)}
                              className="p-2 text-brand-grey hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-black text-brand-grey mb-1.5 uppercase tracking-widest">Cohort Name</label>
                    <input
                      type="text"
                      value={newCohortName}
                      onChange={e => setNewCohortName(e.target.value)}
                      placeholder="e.g. July 7th Kickoff"
                      className="w-full px-3 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-brand-grey mb-1.5 uppercase tracking-widest">Start Date</label>
                    <input
                      type="date"
                      value={newCohortDate}
                      onChange={e => setNewCohortDate(e.target.value)}
                      className="px-3 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={addCohort}
                    disabled={savingCohort || !newCohortName.trim() || !newCohortDate}
                    className="px-4 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {savingCohort ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add
                  </button>
                </div>
                {cohortError && (
                  <p className="text-sm text-red-600 mt-2">{cohortError}</p>
                )}
              </div>

              {/* Cohort Roster */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light"><Users className="w-5 h-5" /></div>
                  <h2 className="font-heading text-2xl tracking-wide pt-1">COHORT ROSTER</h2>
                </div>
                {cohortMembershipError && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{cohortMembershipError}</p>
                )}
                {cohorts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-white shadow-sm">
                    <p className="text-sm text-brand-grey">No cohorts yet — add one above.</p>
                  </div>
                ) : cohorts.map(c => {
                  const members = participants.filter(p => p.cohort === c.name);
                  return (
                    <div key={c.id} className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-brand-dark">{c.name}</h3>
                          <p className="text-xs text-brand-grey mt-0.5">{new Date(c.start_date + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })} · {members.length} participant{members.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {members.length === 0 ? (
                        <p className="text-sm text-brand-grey text-center py-4">No participants in this cohort yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {members.map(p => {
                            const pending = pendingCohortMove[p.id] ?? p.cohort;
                            const isDirty = pending !== p.cohort;
                            return (
                              <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-brand-sand">
                                <Avatar id={p.id} name={p.name} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-brand-dark truncate">{p.name}</p>
                                  <p className="text-xs text-brand-grey truncate">{p.email}</p>
                                </div>
                                <select
                                  value={pending}
                                  onChange={e => setPendingCohortMove(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors shrink-0"
                                >
                                  {cohorts.map(co => (
                                    <option key={co.id} value={co.name}>{co.name}</option>
                                  ))}
                                </select>
                                {isDirty && (
                                  <button
                                    onClick={() => assignParticipantToCohort(p.id, pendingCohortMove[p.id])}
                                    disabled={assigningParticipantId === p.id}
                                    className="px-3 py-1.5 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50 shrink-0"
                                  >
                                    {assigningParticipantId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Move'}
                                  </button>
                                )}
                                <button
                                  onClick={() => assignParticipantToCohort(p.id, null)}
                                  disabled={assigningParticipantId === p.id}
                                  title="Remove from cohort"
                                  className="p-1.5 text-brand-grey hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 shrink-0 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unassigned Participants */}
              {(() => {
                const unassigned = participants.filter(p => !p.cohort);
                if (unassigned.length === 0) return null;
                return (
                  <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500"><AlertTriangle className="w-5 h-5" /></div>
                      <div>
                        <h2 className="font-heading text-2xl tracking-wide pt-1">UNASSIGNED</h2>
                        <p className="text-xs text-brand-grey">These participants haven&apos;t been placed in a cohort yet.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {unassigned.map(p => {
                        const pending = pendingCohortMove[p.id] ?? '';
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-brand-sand">
                            <Avatar id={p.id} name={p.name} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-brand-dark truncate">{p.name}</p>
                              <p className="text-xs text-brand-grey truncate">{p.email}</p>
                            </div>
                            {cohorts.length > 0 ? (
                              <>
                                <select
                                  value={pending}
                                  onChange={e => setPendingCohortMove(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold text-brand-dark border border-transparent focus:border-brand-light focus:outline-none transition-colors shrink-0"
                                >
                                  <option value="">Select cohort…</option>
                                  {cohorts.map(co => (
                                    <option key={co.id} value={co.name}>{co.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => pending && assignParticipantToCohort(p.id, pending)}
                                  disabled={!pending || assigningParticipantId === p.id}
                                  className="px-3 py-1.5 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {assigningParticipantId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
                                </button>
                              </>
                            ) : (
                              <p className="text-xs text-brand-grey">Add a cohort above first.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ── TOPICS TAB ───────────────────────────────────────────────── */}
          {tab === "topics" && (
            <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-brand-mid/10 rounded-xl text-brand-mid"><MessageSquare className="w-5 h-5" /></div>
                <h2 className="font-heading text-2xl tracking-wide pt-1">TOP TOPICS</h2>
              </div>
              <p className="text-sm text-brand-grey mb-6">What clients ask about most — extracted automatically from every voice session.</p>

              {topics.length === 0 ? (
                <p className="text-sm text-brand-grey text-center py-12">
                  No sessions recorded yet. Topics appear here after the first voice session ends.
                </p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const max = topics[0]?.count ?? 1;
                    return topics.map(({ topic, count }) => (
                      <div key={topic} className="flex items-center gap-4">
                        <div className="w-48 shrink-0 text-sm font-bold text-brand-dark">{topic}</div>
                        <div className="flex-1 h-3 bg-brand-sand rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-light rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                          />
                        </div>
                        <div className="w-10 text-right text-sm font-black text-brand-dark shrink-0">{count}</div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── HANDOUTS TAB ─────────────────────────────────────────────── */}
          {tab === "handouts" && (
            <div className="space-y-8">

              {/* Onboarding Pack */}
              <div className="space-y-3">
                <div>
                  <h2 className="font-heading text-2xl tracking-wide text-brand-dark">ONBOARDING PACK</h2>
                  <p className="text-sm text-brand-grey mt-1">
                    Pre-program resource shown to participants during onboarding and in their workbook. Replace it any time — participants always get the latest version.
                  </p>
                </div>

                <div className={`bg-white rounded-3xl p-5 border shadow-sm flex items-center gap-4 ${
                  onboardingPackExists ? "border-brand-green/30" : "border-white"
                }`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    onboardingPackExists ? "bg-brand-green/10 text-brand-mid" : "bg-brand-sand text-brand-grey"
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-brand-dark">Onboarding Pack</p>
                    <p className="text-xs text-brand-grey">Pre-program PDF for all participants</p>
                    {onboardingPackExists && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-brand-green" />
                        <span className="text-[10px] font-bold text-brand-green">PDF uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onboardingPackExists && (
                      <>
                        <button
                          onClick={getOnboardingPackUrl}
                          title="Preview"
                          className="p-2 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleOnboardingPackDelete}
                          title="Remove"
                          className="p-2 rounded-xl hover:bg-red-50 transition-colors text-brand-grey hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <label className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      onboardingPackUploading ? "opacity-50 pointer-events-none" : "hover:bg-brand-sand text-brand-grey"
                    }`} title={onboardingPackExists ? "Replace PDF" : "Upload PDF"}>
                      {onboardingPackUploading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Upload className="w-4 h-4" />}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleOnboardingPackUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Weekly Handouts */}
              <div className="space-y-3">
              <div>
                <h2 className="font-heading text-2xl tracking-wide text-brand-dark">WEEKLY HANDOUTS</h2>
                <p className="text-sm text-brand-grey mt-1">
                  Upload PDFs for each week. Participants can download them from the workbook once uploaded.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {handouts.map(h => (
                  <div
                    key={h.week}
                    className={`bg-white rounded-3xl p-5 border shadow-sm flex items-center gap-4 ${
                      h.exists ? "border-brand-green/30" : "border-white"
                    }`}
                  >
                    {/* Week badge */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg ${
                      h.exists ? "bg-brand-green/10 text-brand-mid" : "bg-brand-sand text-brand-grey"
                    }`}>
                      {h.week}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-brand-dark truncate">Week {h.week}</p>
                      <p className="text-xs text-brand-grey truncate">{h.theme}</p>
                      {h.exists && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-brand-green" />
                          <span className="text-[10px] font-bold text-brand-green">PDF uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {h.exists && (
                        <>
                          {/* Preview */}
                          <button
                            onClick={() => getHandoutUrl(h.week)}
                            title="Preview"
                            className="p-2 rounded-xl hover:bg-brand-sand transition-colors text-brand-grey"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleHandoutDelete(h.week)}
                            title="Remove"
                            className="p-2 rounded-xl hover:bg-red-50 transition-colors text-brand-grey hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Upload */}
                      <label className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        h.uploading
                          ? "opacity-50 pointer-events-none"
                          : "hover:bg-brand-sand text-brand-grey"
                      }`} title={h.exists ? "Replace PDF" : "Upload PDF"}>
                        {h.uploading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Upload className="w-4 h-4" />}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleHandoutUpload(h.week, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* ── CONTENT TAB ──────────────────────────────────────────────── */}
          {tab === "content" && (
            <div className="space-y-8">
              <div>
                <h2 className="font-heading text-2xl tracking-wide text-brand-dark">WEEKLY CONTENT</h2>
                <p className="text-sm text-brand-grey mt-1">Manage Zoom links, session replay links, and the WhatsApp group link for each cohort.</p>
              </div>

              {/* Cohort picker */}
              {cohorts.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-white shadow-sm">
                  <p className="text-sm text-brand-grey">No cohorts yet — add one in the Cohorts tab first.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 items-center flex-wrap">
                    <p className="text-xs font-black text-brand-grey uppercase tracking-wider">Cohort</p>
                    {cohorts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setContentCohortId(c.id);
                          setContentWeek(1);
                          fetchWeeklyContent(c.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                          contentCohortId === c.id
                            ? 'bg-brand-dark text-white'
                            : 'bg-white border border-brand-sand text-brand-dark hover:bg-brand-sand'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {contentCohortId && (
                    contentLoaded ? (
                      <>
                        {/* WhatsApp link (cohort-level) */}
                        <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-mid"><Link2 className="w-5 h-5" /></div>
                            <div>
                              <h3 className="font-heading text-xl tracking-wide">WHATSAPP GROUP</h3>
                              <p className="text-xs text-brand-grey mt-0.5">Cohort-wide invite link shown on every week's resources page</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={whatsappLink}
                              onChange={e => setWhatsappLink(e.target.value)}
                              placeholder="https://chat.whatsapp.com/…"
                              className="flex-1 px-4 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                            />
                            <button
                              onClick={saveWhatsapp}
                              disabled={savingWhatsapp}
                              className="flex items-center gap-2 px-4 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50 shrink-0"
                            >
                              {savingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : whatsappSaved ? <CheckCircle2 className="w-4 h-4 text-brand-green" /> : <Save className="w-4 h-4" />}
                              {whatsappSaved ? 'Saved!' : 'Save'}
                            </button>
                          </div>
                        </div>

                        {/* Week picker */}
                        <div className="flex gap-1.5 flex-wrap">
                          {Array.from({ length: 8 }, (_, i) => i + 1).map(w => (
                            <button
                              key={w}
                              onClick={() => setContentWeek(w)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                                contentWeek === w
                                  ? 'bg-brand-dark text-white'
                                  : 'bg-white border border-brand-sand text-brand-dark hover:bg-brand-sand'
                              }`}
                            >
                              Week {w}
                            </button>
                          ))}
                        </div>

                        {/* Links for selected week */}
                        <div className="bg-white rounded-3xl p-6 border border-white shadow-sm space-y-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-brand-dark/10 flex items-center justify-center font-black text-brand-dark shrink-0">{contentWeek}</div>
                            <div>
                              <h3 className="font-heading text-xl tracking-wide">WEEK {contentWeek}</h3>
                              <p className="text-xs text-brand-grey">{WEEK_THEMES[contentWeek - 1]}</p>
                            </div>
                          </div>

                          {/* Zoom link */}
                          <div>
                            <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-1.5">Live Session Zoom Link</label>
                            <input
                              type="url"
                              value={weeklyLinks[contentWeek]?.zoom_link ?? ''}
                              onChange={e => setWeeklyLinks(prev => ({
                                ...prev,
                                [contentWeek]: { ...prev[contentWeek], zoom_link: e.target.value },
                              }))}
                              placeholder="https://us02web.zoom.us/j/…"
                              className="w-full px-4 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                            />
                          </div>

                          {/* Replay link */}
                          <div>
                            <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-1.5">Session Replay Link</label>
                            <input
                              type="url"
                              value={weeklyLinks[contentWeek]?.replay_link ?? ''}
                              onChange={e => setWeeklyLinks(prev => ({
                                ...prev,
                                [contentWeek]: { ...prev[contentWeek], replay_link: e.target.value },
                              }))}
                              placeholder="https://vimeo.com/… or Google Drive link"
                              className="w-full px-4 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                            />
                            <p className="text-[10px] text-brand-grey mt-1">Paste this after the session has happened. Participants will see a "Watch replay" button.</p>
                          </div>

                          {/* Replay timestamps */}
                          <div>
                            <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-1.5">Replay Chapter Timestamps</label>
                            <div className="space-y-2">
                              {(weeklyLinks[contentWeek]?.replay_timestamps ?? []).map((ts, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={ts.label}
                                    onChange={e => setWeeklyLinks(prev => {
                                      const updated = [...(prev[contentWeek]?.replay_timestamps ?? [])];
                                      updated[i] = { ...updated[i], label: e.target.value };
                                      return { ...prev, [contentWeek]: { ...prev[contentWeek], replay_timestamps: updated } };
                                    })}
                                    placeholder="Chapter label"
                                    className="flex-1 px-3 py-2 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    value={ts.seconds}
                                    onChange={e => setWeeklyLinks(prev => {
                                      const updated = [...(prev[contentWeek]?.replay_timestamps ?? [])];
                                      updated[i] = { ...updated[i], seconds: Number(e.target.value) };
                                      return { ...prev, [contentWeek]: { ...prev[contentWeek], replay_timestamps: updated } };
                                    })}
                                    placeholder="Seconds"
                                    min={0}
                                    className="w-24 px-3 py-2 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setWeeklyLinks(prev => {
                                      const updated = (prev[contentWeek]?.replay_timestamps ?? []).filter((_, j) => j !== i);
                                      return { ...prev, [contentWeek]: { ...prev[contentWeek], replay_timestamps: updated } };
                                    })}
                                    className="p-2 text-brand-grey hover:text-red-500 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => setWeeklyLinks(prev => {
                                  const updated = [...(prev[contentWeek]?.replay_timestamps ?? []), { label: '', seconds: 0 }];
                                  return { ...prev, [contentWeek]: { ...prev[contentWeek], replay_timestamps: updated } };
                                })}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-brand-light hover:text-brand-dark transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add chapter
                              </button>
                            </div>
                            <p className="text-[10px] text-brand-grey mt-1">Each chapter becomes a jump link in the participant's workbook replay.</p>
                          </div>

                          {/* Session topic */}
                          <div>
                            <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-1.5">Session Topic (shown in workbook prep card)</label>
                            <input
                              type="text"
                              value={weeklyLinks[contentWeek]?.session_topic ?? ''}
                              onChange={e => setWeeklyLinks(prev => ({
                                ...prev,
                                [contentWeek]: { ...prev[contentWeek], session_topic: e.target.value },
                              }))}
                              placeholder="e.g. Nutrition & Fuel — protein timing"
                              className="w-full px-4 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                            />
                          </div>

                          {/* Session prep text */}
                          <div>
                            <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-1.5">Prepare for session (one item per line)</label>
                            <textarea
                              value={weeklyLinks[contentWeek]?.session_prep_text ?? ''}
                              onChange={e => setWeeklyLinks(prev => ({
                                ...prev,
                                [contentWeek]: { ...prev[contentWeek], session_prep_text: e.target.value },
                              }))}
                              placeholder={"Read Week 4 handout\nBring your food diary\nComplete the meal timing template"}
                              rows={4}
                              className="w-full px-4 py-2.5 bg-brand-sand rounded-xl text-sm text-brand-dark border border-transparent focus:border-brand-light focus:outline-none resize-none"
                            />
                            <p className="text-[10px] text-brand-grey mt-1">Each line becomes a bullet point in the participant's workbook.</p>
                          </div>

                          <button
                            onClick={() => saveWeekLinks(contentWeek)}
                            disabled={savingWeek === contentWeek}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50"
                          >
                            {savingWeek === contentWeek
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : weekSaved === contentWeek
                                ? <CheckCircle2 className="w-4 h-4 text-brand-green" />
                                : <Save className="w-4 h-4" />}
                            {weekSaved === contentWeek ? 'Saved!' : 'Save Week Links'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>
                    )
                  )}

                  {!contentCohortId && (
                    <div className="bg-white rounded-3xl p-8 text-center border border-white shadow-sm">
                      <p className="text-sm text-brand-grey">Select a cohort above to manage its weekly content.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── ALERTS TAB ───────────────────────────────────────────────── */}
          {tab === "alerts" && (
            <div className="space-y-8">

              {/* Engagement alerts section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-2xl tracking-wide text-brand-dark">ENGAGEMENT ALERTS</h2>
                    <p className="text-sm text-brand-grey mt-1">
                      No-activity (5+ days) and low-energy patterns (3+ consecutive check-ins at 1–2).
                    </p>
                  </div>
                  <button
                    onClick={runEngagementCheck}
                    disabled={runningCheck}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-sand text-brand-dark text-xs font-bold rounded-xl hover:bg-brand-grey/20 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {runningCheck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Run check
                  </button>
                </div>

                {!engAlertsLoaded ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>
                ) : engAlerts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-white shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-brand-green mx-auto mb-2" />
                    <p className="font-bold text-brand-dark">No engagement alerts</p>
                    <p className="text-sm text-brand-grey mt-1">Run the check to detect inactive or low-energy participants.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {engAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`rounded-3xl border p-5 flex items-start gap-4 ${
                          alert.severity === 'high' ? 'border-amber-300 bg-amber-50/40' : 'border-brand-sand bg-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                          alert.type === 'no_engagement' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {alert.type === 'no_engagement' ? <Clock className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-brand-dark">{alert.participant_name}</p>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              alert.severity === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-brand-sand text-brand-grey'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-sand text-brand-grey">
                              {alert.type === 'no_engagement' ? 'No activity' : 'Low energy'}
                            </span>
                          </div>
                          <p className="text-sm text-brand-dark mt-1">{alert.message}</p>
                          <p className="text-xs text-brand-grey mt-1">{new Date(alert.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/admin/participant/${alert.user_id}`}
                            className="px-3 py-1.5 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-brand-mid transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => resolveEngAlert(alert.id)}
                            className="px-3 py-1.5 bg-brand-sand text-brand-dark text-xs font-bold rounded-xl hover:bg-brand-grey/20 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crisis alerts section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-2xl tracking-wide text-brand-dark">CRISIS ALERTS</h2>
                    <p className="text-sm text-brand-grey mt-1">
                      Crisis flags raised during voice sessions — review each one and mark as resolved.
                    </p>
                  </div>
                  {incidents.filter(i => i.status === 'pending').length > 0 && (
                    <span className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-black uppercase tracking-wider rounded-full">
                      {incidents.filter(i => i.status === 'pending').length} unreviewed
                    </span>
                  )}
                </div>

              {!incidentsLoaded ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>
              ) : incidents.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-white shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-brand-green mx-auto mb-3" />
                  <p className="font-bold text-brand-dark">No alerts — all clear</p>
                  <p className="text-sm text-brand-grey mt-1">Crisis flags will appear here when triggered during a session.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.map(inc => {
                    const isExpanded = expandedIncident === inc.id;
                    const isPending  = inc.status === 'pending';
                    const riskColor  = inc.risk_level === 'high'
                      ? 'border-red-300 bg-red-50/40'
                      : inc.risk_level === 'medium'
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-brand-sand bg-white';
                    const riskBadge  = inc.risk_level === 'high'
                      ? 'bg-red-100 text-red-700'
                      : inc.risk_level === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-brand-sand text-brand-grey';

                    return (
                      <div key={inc.id} className={`rounded-3xl border overflow-hidden ${riskColor}`}>
                        {/* Header row */}
                        <div className="flex items-center gap-4 p-5">
                          <div className="w-10 h-10 rounded-full bg-brand-dark/10 flex items-center justify-center text-xs font-black text-brand-dark shrink-0">
                            {inc.participant_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-brand-dark">{inc.participant_name}</p>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${riskBadge}`}>
                                {inc.risk_level} risk
                              </span>
                              {!isPending && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-mid">
                                  reviewed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brand-grey mt-0.5">
                              {new Date(inc.created_at).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', dateStyle: 'medium', timeStyle: 'short' })}
                              {inc.researcher_notified_at && ' · Email sent to Eske'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isPending && (
                              <button
                                onClick={() => markIncidentReviewed(inc.id)}
                                className="px-3 py-1.5 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-brand-mid transition-colors"
                              >
                                Mark reviewed
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                              className="p-2 rounded-xl hover:bg-white/60 transition-colors text-brand-grey"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-white/60 p-5 space-y-5">

                            {/* Triggers */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {[
                                { label: 'Hard triggers', items: inc.risk_reasons?.hard_triggers ?? [] },
                                { label: 'Soft triggers',  items: inc.risk_reasons?.soft_triggers  ?? [] },
                                { label: 'Planning words', items: inc.risk_reasons?.planning_words ?? [] },
                              ].map(({ label, items }) => (
                                <div key={label} className="bg-white/70 rounded-2xl p-3">
                                  <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-2">{label}</p>
                                  {items.length === 0
                                    ? <p className="text-xs text-brand-grey italic">None</p>
                                    : items.map((t: string) => (
                                        <span key={t} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                          {t}
                                        </span>
                                      ))}
                                </div>
                              ))}
                            </div>

                            {/* Full transcript */}
                            {inc.full_transcript && inc.full_transcript.length > 0 ? (
                              <div>
                                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-3">Full Conversation Transcript</p>
                                <div className="bg-white/70 rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto">
                                  {inc.full_transcript.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      {msg.role === 'agent' && (
                                        <div className="w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center shrink-0 mt-0.5">
                                          <span className="text-[8px] font-black text-white">CS</span>
                                        </div>
                                      )}
                                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                        msg.role === 'user'
                                          ? 'bg-brand-dark text-white rounded-tr-sm'
                                          : 'bg-brand-sand text-brand-dark rounded-tl-sm'
                                      }`}>
                                        {msg.message}
                                      </div>
                                      {msg.role === 'user' && (
                                        <div className="w-6 h-6 rounded-full bg-brand-mid/20 flex items-center justify-center shrink-0 mt-0.5">
                                          <span className="text-[8px] font-black text-brand-dark">
                                            {inc.participant_name[0]}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white/70 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-brand-grey uppercase tracking-wider mb-2">User Message Excerpt</p>
                                <p className="text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">{inc.user_message}</p>
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
            </div>
          )}

          {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
          {tab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-2xl tracking-wide text-brand-dark">PROGRAM SETTINGS</h2>
                <p className="text-sm text-brand-grey mt-1">Configure alert thresholds and default voice caps for your program.</p>
              </div>

              {!settingsLoaded ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-light" /></div>
              ) : (
                <div className="space-y-6">

                  {/* Alert thresholds */}
                  <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500"><AlertTriangle className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-heading text-xl tracking-wide">ALERT THRESHOLDS</h3>
                        <p className="text-xs text-brand-grey mt-0.5">When to flag participants for your attention</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-2">
                          No-activity alert after
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={settingsDraft.no_activity_days}
                            onChange={e => setSettingsDraft(prev => ({ ...prev, no_activity_days: parseInt(e.target.value) || 5 }))}
                            className="w-20 px-3 py-2.5 bg-brand-sand rounded-xl text-sm font-bold text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                          />
                          <span className="text-sm text-brand-grey font-semibold">days without login</span>
                        </div>
                        <p className="text-[10px] text-brand-grey mt-2">Saved: {settings.no_activity_days} days</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-brand-grey uppercase tracking-wider block mb-2">
                          Low-energy alert after
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={2}
                            max={10}
                            value={settingsDraft.low_energy_streak}
                            onChange={e => setSettingsDraft(prev => ({ ...prev, low_energy_streak: parseInt(e.target.value) || 3 }))}
                            className="w-20 px-3 py-2.5 bg-brand-sand rounded-xl text-sm font-bold text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                          />
                          <span className="text-sm text-brand-grey font-semibold">consecutive low check-ins (1–2 energy)</span>
                        </div>
                        <p className="text-[10px] text-brand-grey mt-2">Saved: {settings.low_energy_streak} consecutive</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-brand-grey mt-5 p-3 bg-brand-sand/60 rounded-xl leading-relaxed">
                      Crisis alerts are always on and cannot be configured — they fire immediately when risk words are detected in any voice session.
                    </p>
                  </div>

                  {/* Default voice cap */}
                  <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-brand-mid/10 rounded-xl text-brand-mid"><Clock className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-heading text-xl tracking-wide">DEFAULT VOICE CAP</h3>
                        <p className="text-xs text-brand-grey mt-0.5">Per-participant weekly coaching minutes limit</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={10}
                        max={600}
                        step={10}
                        value={settingsDraft.default_weekly_cap_minutes}
                        onChange={e => setSettingsDraft(prev => ({ ...prev, default_weekly_cap_minutes: parseInt(e.target.value) || 120 }))}
                        className="w-28 px-3 py-2.5 bg-brand-sand rounded-xl text-sm font-bold text-brand-dark border border-transparent focus:border-brand-light focus:outline-none"
                      />
                      <span className="text-sm text-brand-grey font-semibold">minutes per participant per week</span>
                    </div>
                    <p className="text-xs text-brand-grey mt-3">
                      Individual caps can be overridden per participant in their profile view. Saved: {settings.default_weekly_cap_minutes} min.
                    </p>
                  </div>

                  {/* Cohort dates pointer */}
                  <div className="bg-white rounded-3xl p-6 border border-white shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-brand-dark/5 rounded-xl text-brand-dark"><Users className="w-5 h-5" /></div>
                      <h3 className="font-heading text-xl tracking-wide">COHORT DATES</h3>
                    </div>
                    <p className="text-sm text-brand-grey">
                      Cohort names, start dates, and Zoom links are managed in the{' '}
                      <button className="font-bold text-brand-dark hover:underline" onClick={() => setTab("cohorts")}>
                        Cohorts tab
                      </button>
                      .
                    </p>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end">
                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white font-bold text-sm rounded-2xl hover:bg-brand-mid transition-colors disabled:opacity-60"
                    >
                      {savingSettings
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : settingsSaved
                          ? <CheckCircle2 className="w-4 h-4 text-brand-green" />
                          : <Save className="w-4 h-4" />}
                      {settingsSaved ? 'Saved!' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
