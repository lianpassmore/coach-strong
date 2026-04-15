import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // Verify caller is an admin
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

  // Aggregate topic counts across all conversations
  const { data: rows, error } = await adminSupabase
    .from('conversation_topics')
    .select('topic');

  if (error) {
    console.error('Topics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }

  // Count by topic
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    counts[row.topic] = (counts[row.topic] ?? 0) + 1;
  }

  // Sort descending and shape for the UI
  const topics = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => ({ topic, count }));

  return NextResponse.json({ topics });
}
