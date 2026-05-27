import { Redis } from '@upstash/redis';

const REDIS_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

/**
 * Get cached value. Returns null on miss or if Redis is not configured.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Set cached value with TTL in seconds.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Silently fail — cache is optional
  }
}

/**
 * Invalidate one or more cache keys (supports glob patterns).
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (!redis) return;
  try {
    for (const key of keys) {
      if (key.includes('*')) {
        // Pattern delete
        const matched = await redis.keys(key);
        if (matched.length > 0) await redis.del(...matched);
      } else {
        await redis.del(key);
      }
    }
  } catch {
    // Silently fail
  }
}

// Cache key builders
export const CACHE_KEYS = {
  courseCatalog: () => 'courses:catalog',
  courseDetail: (slug: string) => `courses:detail:${slug}`,
  quizQuestions: (lessonId: string) => `quiz:questions:${lessonId}`,
  leaderboard: (courseId: string) => `leaderboard:${courseId}`,
  siteConfig: () => 'site:config',
  profile: (userId: string) => `profile:${userId}`,
} as const;

// TTLs in seconds
export const TTL = {
  courseCatalog: 300,    // 5 min
  courseDetail: 300,     // 5 min
  quizQuestions: 900,    // 15 min
  leaderboard: 600,     // 10 min
  siteConfig: 1800,     // 30 min
  profile: 120,         // 2 min
} as const;
