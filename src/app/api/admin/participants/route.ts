import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — can read all rows regardless of RLS
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  // 1. Verify the caller is authenticated and is an admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Fetch all non-admin profiles
  const { data: profiles, error: profilesError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, cohort, current_week, program_phase, updated_at')
    .eq('is_admin', false)
    .order('updated_at', { ascending: false });

  if (profilesError) {
    console.error('Admin profiles fetch error:', profilesError);
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }

  // 3. Fetch auth users to get emails and last_sign_in_at
  const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers();
  const authMap = new Map(authUsers.map(u => [u.id, u]));

  // 4. Fetch most recent check-in per user (last date + energy)
  const userIds = (profiles ?? []).map(p => p.id);
  const { data: checkins } = userIds.length > 0
    ? await adminSupabase
        .from('check_ins')
        .select('user_id, checked_in_date, energy_level')
        .in('user_id', userIds)
        .order('checked_in_date', { ascending: false })
    : { data: [] };

  // Build per-user latest check-in map
  const latestCheckin = new Map<string, { date: string; energy: number | null }>();
  for (const c of checkins ?? []) {
    if (!latestCheckin.has(c.user_id)) {
      latestCheckin.set(c.user_id, { date: c.checked_in_date, energy: c.energy_level });
    }
  }

  // 5. Compose response
  const participants = (profiles ?? []).map(p => {
    const auth = authMap.get(p.id);
    const checkin = latestCheckin.get(p.id);

    // last seen = latest check-in date, or fall back to last_sign_in_at
    const lastSeenRaw = checkin?.date ?? auth?.last_sign_in_at ?? null;
    const lastSeenDays = daysSince(lastSeenRaw) ?? 999;

    return {
      id:           p.id,
      name:         p.full_name ?? auth?.email?.split('@')[0] ?? 'Unknown',
      email:        auth?.email ?? '',
      week:         p.current_week ?? 0,
      cohort:       p.cohort ?? '',
      phase:        p.program_phase ?? 'onboarding',
      lastSeenDays,
      energy:       checkin?.energy ?? null,
    };
  });

  return NextResponse.json({ participants });
}
