import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

// 1x1 transparent PNG (68 bytes)
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const PIXEL_HEADERS = {
  'Content-Type': 'image/png',
  'Content-Length': TRANSPARENT_PIXEL.length.toString(),
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const { leadId } = params;
  const searchParams = request.nextUrl.searchParams;

  const clientCode = searchParams.get('cc') || null;
  const channel = searchParams.get('ch') || 'email';
  const touchpoint = searchParams.get('tp');

  // Await to prevent serverless early termination
  await logOpen({
    leadId,
    clientCode,
    channel,
    touchpoint: touchpoint ? parseInt(touchpoint, 10) : null,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent') || null,
  }).catch((err) => console.error('[pixel] Failed to log open:', err));

  return new NextResponse(TRANSPARENT_PIXEL, {
    status: 200,
    headers: PIXEL_HEADERS,
  });
}

async function logOpen({
  leadId,
  clientCode,
  channel,
  touchpoint,
  ip,
  userAgent,
}: {
  leadId: string;
  clientCode: string | null;
  channel: string;
  touchpoint: number | null;
  ip: string | null;
  userAgent: string | null;
}) {
  console.log('[pixel] logOpen called with:', JSON.stringify({ leadId, clientCode, channel, touchpoint, ip, userAgent }));

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.warn('[pixel] Supabase env vars missing; skipping open log.');
    return;
  }
  console.log('[pixel] Supabase admin client obtained successfully');

  // Look up resend_message_id from sequence_status
  let messageId: string | null = null;
  if (touchpoint !== null) {
    const { data: seqStatus, error: seqError } = await supabase
      .from('sequence_status')
      .select('resend_message_id')
      .eq('lead_id', leadId)
      .eq('touch_number', touchpoint)
      .limit(1)
      .single();

    console.log('[pixel] sequence_status lookup:', JSON.stringify({ seqStatus, seqError }));

    messageId = seqStatus?.resend_message_id || null;

    // Deduplicate on message_id if available
    if (messageId) {
      const { data: existing, error: dedupError } = await supabase
        .from('email_events')
        .select('id')
        .eq('message_id', messageId)
        .eq('event_type', 'email.opened')
        .limit(1)
        .single();

      console.log('[pixel] dedup check:', JSON.stringify({ existing, dedupError }));

      if (existing) {
        console.log(`[pixel] Open already recorded for message ${messageId}, skipping`);
        return;
      }
    }
  } else {
    console.log('[pixel] No touchpoint provided, skipping sequence_status lookup');
  }

  const insertPayload = {
    lead_id: leadId,
    event_type: 'email.opened',
    message_id: messageId,
    client_code: clientCode,
    channel,
    touchpoint,
    ip,
    user_agent: userAgent,
    source: 'pixel',
  };
  console.log('[pixel] Inserting into email_events:', JSON.stringify(insertPayload));

  const { data: insertData, error } = await supabase.from('email_events').insert(insertPayload).select();

  console.log('[pixel] Insert result:', JSON.stringify({ insertData, error }));

  if (error) {
    console.error('[pixel] Supabase insert error:', error);
  } else {
    console.log('[pixel] Insert successful');
  }
}
