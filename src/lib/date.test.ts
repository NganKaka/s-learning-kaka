import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toISODate, formatDateVn, formatDateTimeVn, formatRelativeTime } from './date';

describe('toISODate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2026-06-09T13:45:00.000Z'))).toBe('2026-06-09');
  });
});

describe('formatDateVn', () => {
  it('renders Vietnamese dd/MM/yyyy from a Date', () => {
    expect(formatDateVn(new Date('2026-06-09T12:00:00.000Z'))).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('accepts an ISO string input', () => {
    expect(formatDateVn('2026-06-09T12:00:00.000Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe('formatDateTimeVn', () => {
  it('includes both date and time components', () => {
    const out = formatDateTimeVn('2026-06-09T12:30:00.000Z');
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-06-09T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const ago = (ms: number) => new Date(now.getTime() - ms);
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('returns "vừa xong" for under a minute', () => {
    expect(formatRelativeTime(ago(30 * SEC))).toBe('vừa xong');
  });

  it('returns minutes for under an hour', () => {
    expect(formatRelativeTime(ago(5 * MIN))).toBe('5 phút trước');
  });

  it('returns hours for under a day', () => {
    expect(formatRelativeTime(ago(3 * HOUR))).toBe('3 giờ trước');
  });

  it('returns days for under a week', () => {
    expect(formatRelativeTime(ago(2 * DAY))).toBe('2 ngày trước');
  });

  it('returns weeks for under a month', () => {
    expect(formatRelativeTime(ago(14 * DAY))).toBe('2 tuần trước');
  });

  it('returns months for under a year', () => {
    expect(formatRelativeTime(ago(90 * DAY))).toBe('3 tháng trước');
  });

  it('returns years beyond a year', () => {
    expect(formatRelativeTime(ago(400 * DAY))).toBe('1 năm trước');
  });
});
