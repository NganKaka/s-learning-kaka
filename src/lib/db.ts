/**
 * Small data-access helpers shared across lib modules.
 */

/**
 * Await a Supabase query, surfacing (logging) any error instead of silently
 * swallowing it, then return `data` or a fallback. Keeps the happy path
 * byte-identical to `const { data } = await query; return data ?? fallback`
 * while making failures visible in the console.
 *
 * Typed permissively (`data: unknown`) to accept any supabase query builder
 * without fighting its generated row generics; the caller supplies the
 * expected shape via the fallback.
 */
export async function unwrap<T>(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  fallback: T,
  context: string,
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error(`[db] ${context}: ${error.message}`);
    return fallback;
  }
  return (data as T | null) ?? fallback;
}
