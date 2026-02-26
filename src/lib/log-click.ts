import type { SupabaseClient } from '@supabase/supabase-js';

import type { ParsedSlug } from '@/src/lib/redirect-config';

export type ClickLogPayload = {
  slug: string;
  channel: ParsedSlug['channel'];
  touchpoint: ParsedSlug['touchpoint'];
  client_code: ParsedSlug['client_code'];
  ip: string | null;
  user_agent: string | null;
  lead_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export async function insertClickLog(supabase: SupabaseClient, payload: ClickLogPayload): Promise<void> {
  const { error } = await supabase.from('link_clicks').insert({
    slug: payload.slug,
    channel: payload.channel,
    touchpoint: payload.touchpoint,
    client_code: payload.client_code,
    ip: payload.ip,
    user_agent: payload.user_agent,
    lead_id: payload.lead_id,
    utm_source: payload.utm_source,
    utm_medium: payload.utm_medium,
    utm_campaign: payload.utm_campaign,
    utm_content: payload.utm_content
  });

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}
