import { NextResponse } from 'next/server';

import { CAMPAIGN_NAME, DESTINATION_URL, parseRedirectSlug } from '@/src/lib/redirect-config';
import { insertClickLog } from '@/src/lib/log-click';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || null;
}

function buildRedirectUrl(slug: string, channel: 'email' | 'sms'): string {
  const url = new URL(DESTINATION_URL);
  url.searchParams.set('utm_source', 'sonalift');
  url.searchParams.set('utm_medium', channel);
  url.searchParams.set('utm_campaign', CAMPAIGN_NAME);
  url.searchParams.set('utm_content', slug);
  return url.toString();
}

export async function GET(request: Request, context: { params: { slug: string } }) {
  const parsed = parseRedirectSlug(context.params.slug);
  if (!parsed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.warn('Supabase env vars are missing; skipping click log insert.');
  } else {
    try {
      await insertClickLog(supabase, {
        slug: parsed.slug,
        channel: parsed.channel,
        touchpoint: parsed.touchpoint,
        client_code: parsed.client_code,
        ip: getRequestIp(request),
        user_agent: request.headers.get('user-agent')
      });
    } catch (error) {
      console.error('Failed to log click:', error);
      // Continue redirecting so tracking outages do not break the user flow.
    }
  }

  const redirectUrl = buildRedirectUrl(parsed.slug, parsed.channel);
  return NextResponse.redirect(redirectUrl, { status: 307 });
}
