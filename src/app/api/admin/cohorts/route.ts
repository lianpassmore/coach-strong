import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAdmin() {
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
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await adminSupabase
    .from('cohorts')
    .select('id, name, start_date, is_active, zoom_link, whatsapp_link')
    .order('start_date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cohorts: data });
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, start_date } = await request.json();
  if (!name || !start_date) {
    return NextResponse.json({ error: 'name and start_date are required' }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from('cohorts')
    .insert({ name, start_date })
    .select('id, name, start_date, is_active, zoom_link, whatsapp_link')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cohort: data }, { status: 201 });
}
