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

export async function GET() {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoDate = sevenDaysAgo.toISOString().split('T')[0];

  const [
    { count: totalParticipants },
    { count: discoveryDone },
    { data: recentCheckIns },
    { data: recentConversations },
  ] = await Promise.all([
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false),
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', false).eq('discovery_completed', true),
    adminSupabase.from('check_ins').select('user_id, energy_level').gte('checked_in_date', sevenDaysAgoDate),
    adminSupabase.from('conversations').select('duration_seconds').gte('started_at', sevenDaysAgo.toISOString()),
  ]);

  const uniqueCheckedIn = new Set((recentCheckIns ?? []).map((c: { user_id: string }) => c.user_id)).size;
  const energyValues = (recentCheckIns ?? [])
    .filter((c: { energy_level: number | null }) => c.energy_level !== null)
    .map((c: { energy_level: number }) => c.energy_level);
  const avgEnergy7d = energyValues.length > 0
    ? Math.round((energyValues.reduce((a: number, b: number) => a + b, 0) / energyValues.length) * 10) / 10
    : null;

  const conversationsThisWeek = (recentConversations ?? []).length;
  const voiceMinutesThisWeek = Math.round(
    (recentConversations ?? []).reduce((sum: number, c: { duration_seconds: number | null }) => sum + (c.duration_seconds ?? 0), 0) / 60
  );

  return NextResponse.json({
    totalParticipants: totalParticipants ?? 0,
    discoveryDone: discoveryDone ?? 0,
    checkInsThisWeek: uniqueCheckedIn,
    avgEnergy7d,
    conversationsThisWeek,
    voiceMinutesThisWeek,
  });
}
