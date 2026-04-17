import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { extractTopics } from '@/lib/topicExtractor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

function parseDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();

  let deviceType = 'desktop';
  if (/ipad|tablet/.test(ua)) deviceType = 'tablet';
  else if (/mobile|android|iphone|ipod/.test(ua)) deviceType = 'mobile';

  let browser = 'unknown';
  if (ua.includes('edg')) browser = 'edge';
  else if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';

  return { deviceType, browser };
}

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// GET — Generate signed URL with user context injected as dynamic variables
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId && user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agentId = process.env.AGENT_ID;
    const apiKey = process.env.API_KEY;

    if (!agentId || !apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs credentials not configured' },
        { status: 500 }
      );
    }

    // Fetch user profile to pass as dynamic variables to the agent
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, preferred_name, cohort, goal, long_term_goal, motivation_word, current_week, program_phase, total_sessions, voice_minutes_cap_per_week, disruption_mode, cycle_tracking_enabled')
      .eq('id', user.id)
      .single();

    // ── Weekly usage cap check ────────────────────────────────────────────────
    const WEEKLY_CAP_SECONDS = (profile?.voice_minutes_cap_per_week ?? 120) * 60;
    // Monday-based week start (ISO week)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const { data: weekSessions } = await supabase
      .from('conversations')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('started_at', weekStart.toISOString());

    const usedSecondsThisWeek = (weekSessions ?? []).reduce(
      (sum, c) => sum + (c.duration_seconds ?? 0), 0
    );
    const remainingSeconds = Math.max(0, WEEKLY_CAP_SECONDS - usedSecondsThisWeek);

    if (usedSecondsThisWeek >= WEEKLY_CAP_SECONDS) {
      const capMins = profile?.voice_minutes_cap_per_week ?? 120;
      return NextResponse.json({
        error: 'weekly_cap_reached',
        message: `You've reached your ${capMins}-minute weekly coaching limit. Your allowance resets Monday — see you then!`,
        usedSeconds: usedSecondsThisWeek,
        capSeconds: WEEKLY_CAP_SECONDS,
        remainingSeconds: 0,
      }, { status: 429 });
    }

    // Fetch today's check-in for energy + assignment status + reflection fields
    const todayNZ = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
    const { data: checkin } = await supabase
      .from('check_ins')
      .select('energy_level, assignment_completed, went_well, morning_intention')
      .eq('user_id', user.id)
      .eq('checked_in_date', todayNZ)
      .maybeSingle();


    // Fetch active knowledge base entries to inject into agent context
    const { data: kbEntries } = await supabase
      .from('knowledge_base')
      .select('category, title, content')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at');

    // Concatenate into a single string: "## Category\n### Title\nContent\n\n…"
    // Capped at ~6000 chars to stay within ElevenLabs dynamic variable limits.
    let knowledgeContext = '';
    if (kbEntries && kbEntries.length > 0) {
      knowledgeContext = kbEntries
        .map(e => `## ${e.category}\n### ${e.title}\n${e.content}`)
        .join('\n\n')
        .slice(0, 6000);
    }

    // Build dynamic variables — these are available in your ElevenLabs
    // agent prompt as {{user_name}}, {{user_week}}, etc.
    const userName = profile?.preferred_name || profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
    const week = profile?.current_week ?? 0;
    const isProgramStarted = week > 0;

    // Fetch weekly goals for current week (needs week to be defined first)
    const { data: weeklyGoal } = week > 0 ? await supabase
      .from('weekly_goals')
      .select('min_goal, max_goal')
      .eq('user_id', user.id)
      .eq('week', week)
      .maybeSingle() : { data: null };

    // P3: Journal entry for weeks 4 and 8
    let journalContext = 'no journal entry this week';
    if (week === 4 || week === 8) {
      const { data: journalEntry } = await supabase
        .from('journal_entries')
        .select('content')
        .eq('user_id', user.id)
        .eq('week', week)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (journalEntry?.content) journalContext = journalEntry.content;
    }

    // P2: disruption mode + cycle day
    const disruptionMode = profile?.disruption_mode ?? false;
    let cycleDayStr = 'not tracked';
    if (profile?.cycle_tracking_enabled) {
      const { data: lastPeriod } = await supabase
        .from('cycle_logs')
        .select('period_start')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastPeriod?.period_start) {
        const start = new Date(lastPeriod.period_start);
        const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }));
        cycleDayStr = String(Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
      }
    }
    const energyLabels: Record<number, string> = { 1: 'very low', 2: 'low', 3: 'moderate', 4: 'good', 5: 'great' };
    const dynamicVariables: Record<string, string> = {
      // Variables referenced in the system prompt
      preferred_name:     userName,   // matches {{preferred_name}} in first_message
      _participant_name_: userName,
      _current_week_:     isProgramStarted ? String(week) : 'pre-program',
      _one_word_:         profile?.motivation_word || '',
      _goals_:            profile?.long_term_goal || profile?.goal || '',
      _values_:           '',
      _energy_today_:     isProgramStarted
        ? (checkin?.energy_level ? energyLabels[checkin.energy_level] ?? String(checkin.energy_level) : 'not checked in today')
        : 'n/a - program has not started yet',
      _weekly_focus_:     '',
      _assignment_status_: isProgramStarted
        ? (checkin ? (checkin.assignment_completed ? 'completed' : 'not yet completed') : 'not checked in today')
        : 'n/a - program has not started yet',
      _min_goal_:          weeklyGoal?.min_goal || 'not set this week',
      _max_goal_:          weeklyGoal?.max_goal || 'not set this week',
      _morning_intention_: checkin?.morning_intention || 'not logged today',
      _went_well_today_:   checkin?.went_well || 'not logged today',
      _disruption_mode_:   disruptionMode ? 'yes — participant is in a disrupted week, adapt your suggestions' : 'no',
      _cycle_day_:         cycleDayStr,
      _journal_week_:      journalContext,
      // Legacy variables kept for compatibility
      user_name:          userName,
      user_cohort:        profile?.cohort          || '',
      user_goal:          profile?.goal            || '',
      user_word:          profile?.motivation_word || '',
      user_week:          isProgramStarted ? String(week) : 'pre-program',
      program_phase:      profile?.program_phase   || 'discovery_pending',
      total_sessions:     String(profile?.total_sessions ?? 0),
      knowledge_context:  knowledgeContext,
    };

    // Track session in DB
    let conversationDbId: string | null = null;
    let sessionNumber = 1;
    let daysSinceLastSession: number | null = null;
    let lastSessionDate: string | null = null;

    const userAgent = request.headers.get('user-agent') || '';
    const { deviceType, browser } = parseDevice(userAgent);

    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    sessionNumber = (count ?? 0) + 1;

    const { data: convo } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        agent_id: agentId,
        session_number: sessionNumber,
        status: 'active',
        device_type: deviceType,
        browser,
      })
      .select('id')
      .single();

    conversationDbId = convo?.id ?? null;

    if (sessionNumber > 1) {
      const { data: lastConvo } = await supabase
        .from('conversations')
        .select('ended_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastConvo?.ended_at) {
        const lastDate = new Date(lastConvo.ended_at);
        lastSessionDate = lastDate.toISOString();
        daysSinceLastSession = Math.floor(
          (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // Generate signed URL so the client can connect as a private agent
    // (required for dynamic variables to be accepted by ElevenLabs)
    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { 'xi-api-key': apiKey } }
    );
    if (!signedUrlRes.ok) {
      const errBody = await signedUrlRes.text();
      console.error(`ElevenLabs signed URL error ${signedUrlRes.status}:`, errBody);
      return NextResponse.json(
        { error: 'Failed to get signed URL from ElevenLabs', detail: errBody },
        { status: 502 }
      );
    }
    const { signed_url: signedUrl } = await signedUrlRes.json();

    return NextResponse.json({
      signedUrl,
      dynamicVariables,
      conversationDbId,
      sessionNumber,
      daysSinceLastSession,
      lastSessionDate,
      usedSeconds: usedSecondsThisWeek,
      remainingSeconds,
      capSeconds: WEEKLY_CAP_SECONDS,
      profile: {
        name: dynamicVariables.user_name,
        week,
        phase: profile?.program_phase ?? 'discovery_pending',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error generating signed URL:', msg);
    return NextResponse.json({ error: 'Failed to generate signed URL', detail: msg }, { status: 500 });
  }
}

// PATCH — Link ElevenLabs conversation_id to our DB row
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationDbId, elevenLabsConversationId } = await request.json();

    if (!conversationDbId || !elevenLabsConversationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: convo } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationDbId)
      .single();

    if (!convo || convo.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await supabase
      .from('conversations')
      .update({ conversation_id: elevenLabsConversationId })
      .eq('id', conversationDbId);

    return NextResponse.json({ status: 'linked' });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT — End session, record duration, increment total_sessions
export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationDbId } = await request.json();

    if (!conversationDbId) {
      return NextResponse.json({ error: 'Missing conversationDbId' }, { status: 400 });
    }

    const { data: convo } = await supabase
      .from('conversations')
      .select('started_at, user_id')
      .eq('id', conversationDbId)
      .single();

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (convo.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const endedAt = new Date();
    const durationSeconds = Math.round(
      (endedAt.getTime() - new Date(convo.started_at).getTime()) / 1000
    );

    await supabase
      .from('conversations')
      .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds, status: 'completed' })
      .eq('id', conversationDbId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('total_sessions')
      .eq('id', convo.user_id)
      .single();

    await supabase
      .from('profiles')
      .update({
        total_sessions: (profile?.total_sessions ?? 0) + 1,
        last_active_at: endedAt.toISOString(),
      })
      .eq('id', convo.user_id);

    return NextResponse.json({ status: 'ended', durationSeconds });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST — Webhook for crisis detection (no user auth — uses signature verification)
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sigHeader = request.headers.get('elevenlabs-signature');
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('ELEVENLABS_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!sigHeader) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const client = new ElevenLabsClient({ apiKey: process.env.API_KEY });
    let event;
    try {
      event = await client.webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
    } catch {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = event.data ?? JSON.parse(rawBody);
    const transcript = body.transcript || [];
    const conversationId = body.conversation_id;

    // ── Crisis Detection ─────────────────────────────────────────────────────

    const hardTriggers = [
      'kill myself', 'kill her', 'kill him', 'kill them',
      'want to die', 'end it all', 'end my life', 'end it',
      'take my life', 'taking my life', 'taking my own life', 'take my own life',
      'suicide', 'suicidal',
      'going to end it', 'done with life',
      'looking up ways to die', 'researching methods', 'making plans to end',
      'written my goodbyes', 'written my will',
      'could kill them', 'think about killing', 'deserve to die',
      'going to make sure they suffer', 'going to snap',
      'imagining hurting them', 'thinking about how i\'d do it',
      'crash my car', 'drive off the road', 'stockpiling',
      'weapon', 'gun', 'knife',
      'cutting myself', 'burning myself', 'hurting myself',
      'hurt myself', 'harm myself', 'smash my head',
    ];

    const softTriggers = [
      'better off dead', 'better off not here', 'better off without me',
      'do something stupid', 'not worth living',
      'don\'t want to be here', 'don\'t want to live',
      'can\'t do this anymore', 'can\'t keep doing this', 'can\'t go on',
      'no reason to live', 'nothing to live for', 'no point in living',
      'life isn\'t worth', 'not wake up', 'go to sleep forever',
      'want to disappear', 'wish i could vanish',
      'if i\'m not here tomorrow', 'won\'t have to worry about me',
      'last time i\'ll bother you', 'saying goodbye',
      'soon this won\'t be your problem', 'not here tomorrow',
      'i\'m a burden', 'i ruin everything', 'broken beyond repair',
      'nobody would notice if i was gone', 'no one cares about me',
      'everyone would be happier without me', 'i\'m just in the way',
      'i don\'t deserve love', 'i don\'t deserve happiness',
      'i hate myself', 'i\'m useless', 'i\'m nothing', 'i\'m a failure',
      'i\'ve let everyone down', 'don\'t care what happens to me',
      'might as well die', 'rather die than live without',
      'if they leave me i\'ll kill', 'want to hurt them so they know',
      'don\'t care what happens to me if i hurt', 'show them what they\'ve done',
      'hurt myself to cope', 'need pain to feel', 'deserve to be punished',
      'scratched myself on purpose',
      'hit me', 'beat me', 'beats me', 'hurt me', 'hurts me',
      'scared of him', 'scared of her',
      'he hits', 'she hits', 'choke', 'strangle',
      'want to hurt them', 'want to make them pay',
    ];

    const planningWords = [
      'tonight', 'tomorrow', 'plan', 'planned', 'planning',
      'how to', 'method', 'pills', 'overdose', 'bridge',
      'rope', 'jump', 'bought', 'ready', 'decided', 'goodbye',
      'letter', 'will', 'final', 'last time',
    ];

    const userMessages = transcript
      .filter((t: { role: string }) => t.role === 'user')
      .map((t: { message: string }) => t.message)
      .join(' ')
      .toLowerCase();

    const matchedHard     = hardTriggers.filter(k => userMessages.includes(k));
    const matchedSoft     = softTriggers.filter(k => userMessages.includes(k));
    const matchedPlanning = planningWords.filter(k => userMessages.includes(k));
    const allMatched      = [...matchedHard, ...matchedSoft];

    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    if (matchedHard.length > 0) {
      riskLevel = 'high';
    } else if (matchedSoft.length > 0 && matchedPlanning.length > 0) {
      riskLevel = 'high';
    } else if (matchedSoft.length >= 2) {
      riskLevel = 'medium';
    } else if (matchedSoft.length === 1) {
      riskLevel = 'low';
    }

    const riskReasons = {
      hard_triggers:  matchedHard,
      soft_triggers:  matchedSoft,
      planning_words: matchedPlanning,
      escalated: matchedSoft.length > 0 && matchedPlanning.length > 0 && matchedHard.length === 0,
    };

    console.log(`Crisis scan: risk=${riskLevel}, matched=${JSON.stringify(riskReasons)}`);

    // Look up conversation record
    let dbConversationId: string | null = null;
    let visibleUserId: string | null = null;
    if (conversationId) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id, user_id')
        .eq('conversation_id', conversationId)
        .single();
      if (convo) {
        dbConversationId = convo.id;
        visibleUserId = convo.user_id;
        // Always save the full transcript on the conversation row
        await supabase
          .from('conversations')
          .update({ transcript })
          .eq('id', convo.id);
      }
    }

    let incidentId: string | null = null;
    if (riskLevel !== 'low' || allMatched.length > 0) {
      const { data: incident } = await supabase.from('crisis_incidents').insert({
        trigger_type:            allMatched[0] || null,
        user_message:            userMessages.substring(0, 2000),
        full_transcript:         transcript,   // full [{role, message}] array
        conversation_id:         dbConversationId,
        user_id:                 visibleUserId,
        researcher_notified_at:  null,
        status:                  'pending',
        risk_level:              riskLevel,
        risk_reasons:            riskReasons,
      }).select('id').single();
      incidentId = incident?.id ?? null;
    }

    if (riskLevel === 'high' || riskLevel === 'medium') {
      const emailResult = await resend.emails.send({
        from: process.env.SAFETY_EMAIL_FROM || 'Ray Safety <onboarding@resend.dev>',
        to: process.env.RESEARCHER_EMAIL!,
        subject: riskLevel === 'high'
          ? '🚨 HIGH RISK — Crisis in Ray Session'
          : '⚠️ MEDIUM RISK — Concern in Ray Session',
        html: `
          <h1 style="color: ${riskLevel === 'high' ? '#8B0000' : '#8B4513'}">
            ${riskLevel === 'high' ? '🚨 High-Risk Crisis Alert' : '⚠️ Medium-Risk Concern'}
          </h1>
          <p><strong>Risk Level:</strong> ${riskLevel.toUpperCase()}</p>
          ${riskReasons.escalated ? '<p><strong>⬆ Escalated:</strong> Soft trigger + planning language detected</p>' : ''}
          <p><strong>Hard Triggers:</strong> ${matchedHard.length > 0 ? matchedHard.map(t => `"${t}"`).join(', ') : 'None'}</p>
          <p><strong>Soft Triggers:</strong> ${matchedSoft.length > 0 ? matchedSoft.map(t => `"${t}"`).join(', ') : 'None'}</p>
          <p><strong>Planning Words:</strong> ${matchedPlanning.length > 0 ? matchedPlanning.map(t => `"${t}"`).join(', ') : 'None'}</p>
          <p><strong>Conversation ID:</strong> ${conversationId}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}</p>
          <hr />
          <h3>User Messages</h3>
          <p style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;">${userMessages.substring(0, 2000)}</p>
          <hr />
          <p><strong>Action:</strong> Review transcript in ElevenLabs dashboard immediately.</p>
        `,
      });

      if (emailResult.error) {
        console.error(
          `CRITICAL: Crisis email FAILED for ${riskLevel} risk conversation ${conversationId}:`,
          JSON.stringify(emailResult.error)
        );
        if (incidentId) {
          await supabase.from('crisis_incidents').update({ status: 'email_failed' }).eq('id', incidentId);
        }
        return NextResponse.json(
          { error: 'Crisis detected but email notification failed', riskLevel },
          { status: 500 }
        );
      }

      console.log('Crisis email sent:', JSON.stringify(emailResult));
      if (incidentId) {
        await supabase.from('crisis_incidents')
          .update({ researcher_notified_at: new Date().toISOString() })
          .eq('id', incidentId);
      }
    }

    // ── Topic Extraction ─────────────────────────────────────────────────────
    // Extract topics from user messages and store for admin frequency analytics.
    const topics = extractTopics(userMessages);
    if (topics.length > 0 && dbConversationId) {
      const { data: convoRow } = await supabase
        .from('conversations')
        .select('user_id, session_number')
        .eq('id', dbConversationId)
        .single();

      if (convoRow) {
        const rows = topics.map(topic => ({
          conversation_id: dbConversationId,
          user_id:         convoRow.user_id,
          topic,
        }));

        await supabase.from('conversation_topics').insert(rows);
        console.log(`Topics stored: ${topics.join(', ')}`);
      }
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
