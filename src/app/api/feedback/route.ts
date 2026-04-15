import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// The single question asked at each touchpoint.
// Update these strings to change what participants see — no UI changes needed.
export const FEEDBACK_QUESTIONS = {
  pre_session:  "Since your last session, what's one change you've noticed or something you tried differently?",
  post_session: "What's your biggest takeaway from today's session?",
} as const;

export type FeedbackType = keyof typeof FEEDBACK_QUESTIONS;

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// GET — Returns the question text for a given feedback_type.
// Used by the UI to display the question without hardcoding it client-side.
// e.g. GET /api/feedback?type=pre_session
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as FeedbackType | null;

  if (!type || !(type in FEEDBACK_QUESTIONS)) {
    return NextResponse.json(
      { error: 'Invalid or missing type. Use pre_session or post_session.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ question: FEEDBACK_QUESTIONS[type] });
}

// POST — Save a participant's feedback response.
// Body: { feedback_type, response, conversation_id?, session_number? }
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { feedback_type, response, conversation_id, session_number } = body;

    if (!feedback_type || !(feedback_type in FEEDBACK_QUESTIONS)) {
      return NextResponse.json(
        { error: 'Invalid feedback_type. Use pre_session or post_session.' },
        { status: 400 }
      );
    }

    if (!response || typeof response !== 'string' || response.trim().length === 0) {
      return NextResponse.json({ error: 'Response is required.' }, { status: 400 });
    }

    if (response.length > 2000) {
      return NextResponse.json({ error: 'Response too long (max 2000 chars).' }, { status: 400 });
    }

    const { error } = await supabase.from('feedback').insert({
      user_id:         user.id,
      feedback_type,
      question:        FEEDBACK_QUESTIONS[feedback_type as FeedbackType],
      response:        response.trim(),
      conversation_id: conversation_id ?? null,
      session_number:  session_number   ?? null,
      submitted_at:    new Date().toISOString(),
    });

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({ status: 'saved' });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
