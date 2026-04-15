"use client";
import { useState, useEffect } from "react";
import { TrendingUp, CheckCircle, Circle, Flame, Activity, Star, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppMenu from "@/components/AppMenu";

const WEEK_THEMES = [
  { week: 1, theme: "Foundation & Identity", label: "W1", short: "Foundation" },
  { week: 2, theme: "Rest & Recovery",        label: "W2", short: "Rest" },
  { week: 3, theme: "Movement & Momentum",    label: "W3", short: "Movement" },
  { week: 4, theme: "Nutrition & Fuel",       label: "W4", short: "Nutrition" },
  { week: 5, theme: "Mental Toughness",       label: "W5", short: "Mental" },
  { week: 6, theme: "Relationships & Support",label: "W6", short: "Relationships" },
  { week: 7, theme: "Habits & Routines",      label: "W7", short: "Habits" },
  { week: 8, theme: "Your Future Self",       label: "W8", short: "Future" },
];

type CheckIn = {
  week: number;
  energy_level: number | null;
  assignment_completed: boolean;
};

type WeeklyEnergyStat = {
  week: number;
  label: string;
  avg: number;
  theme: string;
  short: string;
};

type WeeklyAssignmentStat = {
  week: number;
  theme: string;
  completed: boolean;
};

// ─── SVG Chart ───────────────────────────────────────────────────────────────
function EnergyChart({ data }: { data: WeeklyEnergyStat[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const W = 340, H = 160;
  const padL = 32, padR = 16, padT = 16, padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = data.length;

  const toX = (i: number) => padL + (i / Math.max(n - 1, 1)) * plotW;
  const toY = (v: number) => padT + plotH - ((v - 1) / 4) * plotH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.avg) }));

  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(1);
    return `C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(" ");

  const areaPath = n > 1
    ? `${linePath} L ${pts[n - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : "";

  const yGridLines = [1, 2, 3, 4, 5];

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-brand-grey text-sm font-semibold">
        No check-ins recorded yet
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto", maxHeight: 200 }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#05abc4" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#05abc4" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#286181" />
            <stop offset="100%" stopColor="#05abc4" />
          </linearGradient>
        </defs>

        {yGridLines.map(level => {
          const y = toY(level);
          return (
            <g key={level}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e9ec" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="8" fill="#7e8a93" fontWeight="700">{level}</text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
        {n > 1 && <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {pts.map((p, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y} r={14}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                style={{ cursor: "pointer" }}
              />
              {isHovered && (
                <circle cx={p.x} cy={p.y} r={8} fill="white" stroke="#05abc4" strokeWidth="1.5" opacity="0.5" />
              )}
              <circle
                cx={p.x} cy={p.y}
                r={isHovered ? 5 : 3.5}
                fill={isHovered ? "#05abc4" : "white"}
                stroke={isHovered ? "#286181" : "#05abc4"}
                strokeWidth="2"
                style={{ transition: "r 0.15s, fill 0.15s" }}
              />
              {isHovered && (
                <g>
                  <rect x={p.x - 18} y={p.y - 30} width={36} height={20} rx={6} fill="#110c94" />
                  <text x={p.x} y={p.y - 16} textAnchor="middle" fontSize="9" fill="white" fontWeight="800">
                    {data[i].avg.toFixed(1)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {pts.map((p, i) => (
          <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="8" fill="#7e8a93" fontWeight="700">
            {data[i].label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [energyStats, setEnergyStats] = useState<WeeklyEnergyStat[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<WeeklyAssignmentStat[]>([]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: checkins }] = await Promise.all([
        supabase.from("profiles").select("current_week").eq("id", user.id).single(),
        supabase.from("check_ins").select("week, energy_level, assignment_completed").eq("user_id", user.id),
      ]);

      const week = profile?.current_week ?? 1;
      setCurrentWeek(week);

      const rows: CheckIn[] = checkins ?? [];

      // Group by week
      const byWeek: Record<number, CheckIn[]> = {};
      for (const row of rows) {
        if (!byWeek[row.week]) byWeek[row.week] = [];
        byWeek[row.week].push(row);
      }

      // Weekly energy averages (only weeks with energy data)
      const energy: WeeklyEnergyStat[] = [];
      for (let w = 1; w <= week; w++) {
        const weekRows = byWeek[w] ?? [];
        const energyRows = weekRows.filter(r => r.energy_level !== null);
        if (energyRows.length > 0) {
          const avg = energyRows.reduce((s, r) => s + (r.energy_level ?? 0), 0) / energyRows.length;
          const meta = WEEK_THEMES[w - 1];
          energy.push({ week: w, label: meta.label, avg, theme: meta.theme, short: meta.short });
        }
      }
      setEnergyStats(energy);

      // Assignment completion per week (true if any check-in that week marked it done)
      const assignments: WeeklyAssignmentStat[] = WEEK_THEMES.slice(0, week).map(meta => ({
        week: meta.week,
        theme: meta.theme,
        completed: (byWeek[meta.week] ?? []).some(r => r.assignment_completed),
      }));
      setAssignmentStats(assignments);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-light" />
      </main>
    );
  }

  const avgEnergy = energyStats.length > 0
    ? (energyStats.reduce((s, d) => s + d.avg, 0) / energyStats.length).toFixed(1)
    : "–";

  const peakWeek = energyStats.length > 0
    ? energyStats.reduce((best, d) => d.avg > best.avg ? d : best)
    : null;

  const trend = energyStats.length >= 2
    ? energyStats[energyStats.length - 1].avg > energyStats[0].avg
    : null;

  const completedAssignments = assignmentStats.filter(w => w.completed).length;

  return (
    <main className="min-h-screen bg-brand-sand pb-24 font-sans text-brand-dark">

      {/* Header */}
      <header className="bg-gradient-to-b from-brand-dark to-[#1a15a3] text-white pt-14 pb-12 px-6 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(17,12,148,0.15)] flex justify-between items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10">
          <p className="text-brand-green font-bold text-xs uppercase tracking-[0.2em] mb-2">
            Week {currentWeek} of 8
          </p>
          <h1 className="font-heading text-5xl tracking-wider">YOUR PROGRESS</h1>
        </div>

        <AppMenu />
      </header>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-6 relative z-10">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl p-3 sm:p-4 text-center shadow-sm border border-white">
            <div className="flex justify-center mb-1.5">
              <Activity className="w-4 h-4 text-brand-light" />
            </div>
            <p className="font-black text-xl sm:text-2xl text-brand-dark">{avgEnergy}</p>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-brand-grey mt-0.5">Avg Energy</p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 text-center shadow-sm border border-white">
            <div className="flex justify-center mb-1.5">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-black text-xl sm:text-2xl text-brand-dark">{peakWeek ? `Wk ${peakWeek.week}` : "–"}</p>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-brand-grey mt-0.5">Peak Week</p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 text-center shadow-sm border border-white">
            <div className="flex justify-center mb-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <p className="font-black text-xl sm:text-2xl text-brand-dark">{trend === null ? "–" : trend ? "↑" : "↓"}</p>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-brand-grey mt-0.5">Trending</p>
          </div>
        </div>

        {/* Energy Chart */}
        <section className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-brand-light/10 rounded-xl text-brand-light">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-2xl tracking-wide pt-1">ENERGY TRENDS</h2>
              <p className="text-[10px] text-brand-grey font-bold uppercase tracking-wider">Weekly averages · Scale 1–5</p>
            </div>
          </div>

          <EnergyChart data={energyStats} />

          {energyStats.length > 0 && (
            <div className="flex gap-4 justify-center mt-3 flex-wrap">
              {energyStats.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-light"></div>
                  <p className="text-[9px] font-bold text-brand-grey">{d.short}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assignment History */}
        <section className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-mid/10 rounded-xl text-brand-mid">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h2 className="font-heading text-2xl tracking-wide pt-1">ASSIGNMENTS</h2>
            </div>
            <span className="text-xs font-black text-brand-mid bg-brand-mid/10 px-3 py-1 rounded-full">
              {completedAssignments}/{assignmentStats.length}
            </span>
          </div>

          {assignmentStats.length === 0 ? (
            <p className="text-sm text-brand-grey font-semibold text-center py-4">
              Complete your first daily check-in to start tracking.
            </p>
          ) : (
            <div className="space-y-3">
              {assignmentStats.map((w) => {
                const isExpanded = expandedWeek === w.week;
                return (
                  <div key={w.week} className="rounded-2xl border border-brand-sand overflow-hidden">
                    <button
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-brand-sand/30 transition-colors"
                      onClick={() => setExpandedWeek(isExpanded ? null : w.week)}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        w.completed ? "bg-brand-green/20 text-brand-mid" : "bg-brand-sand text-brand-grey"
                      }`}>
                        {w.week}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-brand-dark truncate">{w.theme}</p>
                        <p className="text-[10px] text-brand-grey font-semibold mt-0.5">
                          {w.completed ? "Assignment completed" : "Not yet completed"}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full shrink-0 ${w.completed ? "bg-brand-green" : "bg-brand-sand border border-brand-grey/30"}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-brand-sand px-4 pb-4 pt-3">
                        <div className="flex items-center gap-3">
                          {w.completed ? (
                            <CheckCircle className="w-4 h-4 text-brand-green shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-brand-grey/30 shrink-0" />
                          )}
                          <span className={`text-sm ${w.completed ? "text-brand-dark font-semibold" : "text-brand-grey"}`}>
                            Weekly workbook assignment
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
