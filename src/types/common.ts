/**
 * Shared types used across the application.
 */

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };
