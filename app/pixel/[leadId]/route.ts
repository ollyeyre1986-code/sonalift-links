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

  // Fire and forget — pixel delivery is never blocked
  logOpen({
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
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.warn('[pixel] Supabase env vars missing; skipping open log.');
    return;
  }

  // Deduplicate on lead_id + touchpoint + source=pixel
  if (touchpoint !== null) {
    const { data: existing } = await supabase
      .from('email_events')
      .select('id')
      .eq('lead_id', leadId)
      .eq('event_type', 'email.opened')
      .eq('touchpoint', touchpoint)
      .eq('source', 'pixel')
      .limit(1)
      .single();

    if (existing) {
      console.log(`[pixel] Open already recorded for lead ${leadId} tp${touchpoint}, skipping`);
      return;
    }
  }

  const { error } = await supabase.from('email_events').insert({
    lead_id: leadId,
    event_type: 'email.opened',
    client_code: clientCode,
    channel,
    touchpoint,
    ip,
    user_agent: userAgent,
    source: 'pixel',
  });

  if (error) {
    console.error('[pixel] Supabase insert error:', error);
  }
}
