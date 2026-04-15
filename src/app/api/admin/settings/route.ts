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

  const { data, error } = await adminSupabase
    .from('program_settings')
    .select('no_activity_days, low_energy_streak, default_weekly_cap_minutes')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // Return defaults if row doesn't exist yet
    return NextResponse.json({
      settings: { no_activity_days: 5, low_energy_streak: 3, default_weekly_cap_minutes: 120 }
    });
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(req: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { no_activity_days, low_energy_streak, default_weekly_cap_minutes } = body;

  const { data, error } = await adminSupabase
    .from('program_settings')
    .upsert({
      id: 1,
      no_activity_days: parseInt(no_activity_days) || 5,
      low_energy_streak: parseInt(low_energy_streak) || 3,
      default_weekly_cap_minutes: parseInt(default_weekly_cap_minutes) || 120,
      updated_at: new Date().toISOString(),
    })
    .select('no_activity_days, low_energy_streak, default_weekly_cap_minutes')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}
