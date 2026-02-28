import { NextResponse } from 'next/server';

import { DESTINATION_URLS, parseRedirectSlug } from '@/src/lib/redirect-config';
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

function getOptionalQueryParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key)?.trim();
  return value || null;
}

function buildRedirectUrl(channel: 'email' | 'sms'): string {
  return DESTINATION_URLS[channel];
}

export async function GET(request: Request, context: { params: { slug: string } }) {
  const parsed = parseRedirectSlug(context.params.slug);
  if (!parsed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
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
        user_agent: request.headers.get('user-agent'),
        lead_id: getOptionalQueryParam(requestUrl, 'lead_id'),
        utm_source: getOptionalQueryParam(requestUrl, 'utm_source'),
        utm_medium: getOptionalQueryParam(requestUrl, 'utm_medium'),
        utm_campaign: getOptionalQueryParam(requestUrl, 'utm_campaign'),
        utm_content: getOptionalQueryParam(requestUrl, 'utm_content')
      });
    } catch (error) {
      console.error('Failed to log click:', error);
      // Continue redirecting so tracking outages do not break the user flow.
    }
  }

  const redirectUrl = buildRedirectUrl(parsed.channel);
  return NextResponse.redirect(redirectUrl, { status: 307 });
}
