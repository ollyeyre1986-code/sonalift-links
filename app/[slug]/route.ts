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

function resolveLeadId(url: URL): string | null {
  const direct = getOptionalQueryParam(url, 'lead_id');
  if (direct) return direct;
  const legacyId = getOptionalQueryParam(url, 'id');
  if (legacyId) return legacyId;
  const camel = getOptionalQueryParam(url, 'leadId');
  if (camel) return camel;
  return null;
}

function resolveTouchpointFromQuery(url: URL): 1 | 2 | 3 | 4 | null {
  const raw = getOptionalQueryParam(url, 'touchpoint') || getOptionalQueryParam(url, 'tp');
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 4) return null;
  return parsed as 1 | 2 | 3 | 4;
}

function resolveChannelFromQuery(url: URL): 'email' | 'sms' | null {
  const raw = getOptionalQueryParam(url, 'ch') || getOptionalQueryParam(url, 'channel');
  if (!raw) return null;
  if (raw === 'email') return 'email';
  if (raw === 'sms') return 'sms';
  return null;
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
  const resolvedChannel = resolveChannelFromQuery(requestUrl) || parsed.channel;
  const resolvedTouchpoint = resolveTouchpointFromQuery(requestUrl) || parsed.touchpoint;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.warn('Supabase env vars are missing; skipping click log insert.');
  } else {
    try {
      await insertClickLog(supabase, {
        slug: parsed.slug,
        channel: resolvedChannel,
        touchpoint: resolvedTouchpoint,
        client_code: parsed.client_code,
        ip: getRequestIp(request),
        user_agent: request.headers.get('user-agent'),
        lead_id: resolveLeadId(requestUrl),
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

  const redirectUrl = buildRedirectUrl(resolvedChannel);
  return NextResponse.redirect(redirectUrl, { status: 301 });
}
