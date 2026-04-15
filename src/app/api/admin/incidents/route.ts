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

// GET — all crisis incidents, newest first, joined with profile name
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: incidents, error } = await adminSupabase
    .from('crisis_incidents')
    .select(`
      id, risk_level, risk_reasons, trigger_type,
      user_message, full_transcript,
      status, researcher_notified_at, created_at,
      user_id,
      conversation_id
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach participant names from profiles
  const userIds = [...new Set((incidents ?? []).map(i => i.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await adminSupabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
    : { data: [] };

  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));

  // Get emails from auth
  const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers();
  const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

  const enriched = (incidents ?? []).map(i => ({
    ...i,
    participant_name: nameMap.get(i.user_id) ?? 'Unknown',
    participant_email: emailMap.get(i.user_id) ?? '',
  }));

  return NextResponse.json({ incidents: enriched });
}

// PATCH — mark incident as reviewed
export async function PATCH(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, status } = await request.json();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const { error } = await adminSupabase
    .from('crisis_incidents')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'updated' });
}
