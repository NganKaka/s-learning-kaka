import { supabase } from './supabase';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_KEYS, TTL } from './cache';

export async function getSiteConfig(): Promise<Record<string, unknown>> {
  const cached = await cacheGet<Record<string, unknown>>(CACHE_KEYS.siteConfig());
  if (cached) return cached;

  const { data } = await supabase.from('site_config').select('key, value');
  const config: Record<string, unknown> = {};
  for (const row of data ?? []) {
    config[row.key as string] = row.value;
  }
  cacheSet(CACHE_KEYS.siteConfig(), config, TTL.siteConfig);
  return config;
}

export async function invalidateSiteConfig(): Promise<void> {
  await cacheInvalidate(CACHE_KEYS.siteConfig());
}
