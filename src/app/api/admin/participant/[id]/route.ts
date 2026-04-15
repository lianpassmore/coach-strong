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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Profile
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, preferred_name, goal, long_term_goal, motivation_word, current_week, cohort, program_phase, program_start_date, created_at, voice_minutes_cap_per_week')
    .eq('id', id)
    .single();

  if (profileError) {
    console.error('Participant profile fetch error:', profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Auth user (email)
  const { data: { user: authUser } } = await adminSupabase.auth.admin.getUserById(id);

  // All check-ins
  const { data: checkIns } = await adminSupabase
    .from('check_ins')
    .select('id, checked_in_date, week, energy_level, assignment_completed, created_at')
    .eq('user_id', id)
    .order('checked_in_date', { ascending: false });

  // All conversations
  const { data: conversations } = await adminSupabase
    .from('conversations')
    .select('id, started_at, ended_at, duration_seconds, status, transcript')
    .eq('user_id', id)
    .order('started_at', { ascending: false });

  // Coach notes
  const { data: coachNotes } = await adminSupabase
    .from('coach_notes')
    .select('id, note, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    profile: { ...profile, email: authUser?.email ?? '', weekly_cap_minutes: profile.voice_minutes_cap_per_week ?? 120 },
    checkIns: checkIns ?? [],
    conversations: conversations ?? [],
    coachNotes: coachNotes ?? [],
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { weekly_cap_minutes, cohort } = body;

  const updates: Record<string, unknown> = {};

  if (weekly_cap_minutes !== undefined) {
    if (typeof weekly_cap_minutes !== 'number' || weekly_cap_minutes < 1) {
      return NextResponse.json({ error: 'Invalid weekly_cap_minutes' }, { status: 400 });
    }
    updates.voice_minutes_cap_per_week = weekly_cap_minutes;
  }

  if ('cohort' in body) {
    if (cohort !== null && typeof cohort !== 'string') {
      return NextResponse.json({ error: 'Invalid cohort' }, { status: 400 });
    }
    updates.cohort = cohort;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updates);
}
