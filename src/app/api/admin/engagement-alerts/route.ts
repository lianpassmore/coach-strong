import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assertAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return data?.is_admin ? user : null;
}

// GET — fetch unresolved engagement alerts with participant info
export async function GET(req: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: alerts } = await adminSupabase
    .from('engagement_alerts')
    .select('id, user_id, type, message, severity, read, resolved, created_at')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!alerts?.length) return NextResponse.json({ alerts: [] });

  const userIds = [...new Set(alerts.map(a => a.user_id))];
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Unknown']));

  return NextResponse.json({
    alerts: alerts.map(a => ({ ...a, participant_name: nameMap.get(a.user_id) ?? 'Unknown' })),
  });
}

// POST — run the alert check (called by cron or manually)
// Cron: add to vercel.json: { "crons": [{ "path": "/api/admin/engagement-alerts/check", "schedule": "0 8 * * *" }] }
export async function POST(req: Request) {
  // Allow cron calls via CRON_SECRET header, or admin session
  const authHeader = req.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const created: string[] = [];

  // Read thresholds from program_settings (fall back to defaults if missing)
  const { data: settingsRow } = await adminSupabase
    .from('program_settings')
    .select('no_activity_days, low_energy_streak')
    .eq('id', 1)
    .single();
  const noActivityDays = settingsRow?.no_activity_days ?? 5;
  const lowEnergyStreak = settingsRow?.low_energy_streak ?? 3;

  // 1. No-engagement: participants with no sign-in in noActivityDays+ days
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_admin', false);

  const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers();
  const lastSignInMap = new Map(authUsers.map(u => [u.id, u.last_sign_in_at]));

  for (const profile of profiles ?? []) {
    const lastSignIn = lastSignInMap.get(profile.id);
    if (!lastSignIn) continue;

    const daysSince = Math.floor((now.getTime() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < noActivityDays) continue;

    // Skip if we already have an unresolved no_engagement alert for this user
    const { data: existing } = await adminSupabase
      .from('engagement_alerts')
      .select('id')
      .eq('user_id', profile.id)
      .eq('type', 'no_engagement')
      .eq('resolved', false)
      .limit(1);

    if (existing?.length) continue;

    const { data } = await adminSupabase
      .from('engagement_alerts')
      .insert({
        user_id: profile.id,
        type: 'no_engagement',
        severity: daysSince >= noActivityDays + 2 ? 'high' : 'medium',
        message: `${profile.full_name ?? 'Participant'} hasn't logged in for ${daysSince} days.`,
      })
      .select('id')
      .single();

    if (data) created.push(data.id);
  }

  // 2. Low energy: 3+ consecutive check-ins with energy_level <= 2
  const { data: allCheckIns } = await adminSupabase
    .from('check_ins')
    .select('user_id, checked_in_date, energy_level')
    .order('checked_in_date', { ascending: false });

  // Group by user
  const byUser = new Map<string, { date: string; energy: number | null }[]>();
  for (const ci of allCheckIns ?? []) {
    const arr = byUser.get(ci.user_id) ?? [];
    arr.push({ date: ci.checked_in_date, energy: ci.energy_level });
    byUser.set(ci.user_id, arr);
  }

  for (const [userId, checkIns] of byUser) {
    // Count leading low-energy entries (already sorted desc by date)
    let streak = 0;
    for (const ci of checkIns) {
      if (ci.energy !== null && ci.energy <= 2) streak++;
      else break;
    }
    if (streak < lowEnergyStreak) continue;

    const { data: existing } = await adminSupabase
      .from('engagement_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'low_energy')
      .eq('resolved', false)
      .limit(1);

    if (existing?.length) continue;

    const profile = (profiles ?? []).find(p => p.id === userId);
    const { data } = await adminSupabase
      .from('engagement_alerts')
      .insert({
        user_id: userId,
        type: 'low_energy',
        severity: streak >= 5 ? 'high' : 'medium',
        message: `${profile?.full_name ?? 'Participant'} has logged low energy (1–2) for ${streak} consecutive check-ins.`,
      })
      .select('id')
      .single();

    if (data) created.push(data.id);
  }

  return NextResponse.json({ ok: true, created: created.length });
}

// PATCH — mark alert as read or resolved
export async function PATCH(req: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, resolved, read } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, boolean> = {};
  if (resolved !== undefined) update.resolved = resolved;
  if (read !== undefined) update.read = read;

  await adminSupabase.from('engagement_alerts').update(update).eq('id', id);
  return NextResponse.json({ ok: true });
}
