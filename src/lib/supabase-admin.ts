import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function getRequiredEnv(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const url = getRequiredEnv('SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedClient;
}
