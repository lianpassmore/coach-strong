import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify caller is admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!callerProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Get the user's email from auth
  const { data: { user: targetUser }, error: userErr } = await adminSupabase.auth.admin.getUserById(id);
  if (userErr || !targetUser?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Trigger Supabase's built-in password reset email
  const { error } = await adminSupabase.auth.resetPasswordForEmail(targetUser.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/setup-password`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: 'sent', email: targetUser.email });
}
