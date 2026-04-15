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

// GET — list all entries ordered by sort_order then created_at
export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await adminSupabase
    .from('knowledge_base')
    .select('id, category, title, content, is_active, sort_order, updated_at')
    .order('sort_order')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// POST — create a new entry
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { category, title, content, is_active = true, sort_order = 0 } = body;
  if (!category || !title || !content) {
    return NextResponse.json({ error: 'category, title, and content are required' }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from('knowledge_base')
    .insert({ category, title, content, is_active, sort_order })
    .select('id, category, title, content, is_active, sort_order, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}
