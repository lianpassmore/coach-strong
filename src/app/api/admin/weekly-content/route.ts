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

// GET /api/admin/weekly-content?cohort_id=xxx
export async function GET(req: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get('cohort_id');
  if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { data } = await adminSupabase
    .from('weekly_content')
    .select('id, week_number, zoom_link, replay_link, session_topic, session_prep_text, replay_timestamps')
    .eq('cohort_id', cohortId)
    .order('week_number');

  // Also get the cohort's whatsapp_link
  const { data: cohort } = await adminSupabase
    .from('cohorts')
    .select('whatsapp_link')
    .eq('id', cohortId)
    .single();

  return NextResponse.json({
    weeks: data ?? [],
    whatsapp_link: cohort?.whatsapp_link ?? null,
  });
}

// PUT /api/admin/weekly-content — upsert a week's links
export async function PUT(req: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cohort_id, week_number, zoom_link, replay_link, session_topic, session_prep_text, replay_timestamps } = await req.json();
  if (!cohort_id || !week_number) {
    return NextResponse.json({ error: 'cohort_id and week_number required' }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from('weekly_content')
    .upsert(
      {
        cohort_id,
        week_number,
        zoom_link: zoom_link ?? null,
        replay_link: replay_link ?? null,
        session_topic: session_topic ?? null,
        session_prep_text: session_prep_text ?? null,
        replay_timestamps: replay_timestamps ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cohort_id,week_number' }
    )
    .select('id, week_number, zoom_link, replay_link, session_topic, session_prep_text, replay_timestamps')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ week: data });
}

// PATCH /api/admin/weekly-content — update cohort whatsapp_link
export async function PATCH(req: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cohort_id, whatsapp_link } = await req.json();
  if (!cohort_id) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

  const { error } = await adminSupabase
    .from('cohorts')
    .update({ whatsapp_link: whatsapp_link ?? null })
    .eq('id', cohort_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
