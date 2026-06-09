import { describe, it, expect, vi } from 'vitest';
import { cloneElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { DailyPoint } from '../../lib/adminStats';

// Recharts needs a measured container; in jsdom ResponsiveContainer reports 0x0
// and renders nothing. Replace it with a fixed-size clone so the chart mounts.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 600, height: 300 }),
  };
});

import AdminStatsChart from './AdminStatsChart';

const sample: DailyPoint[] = [
  { key: '2026-06-07', label: '07/06', revenue: 100000, signups: 2, enrollments: 1, passRate: 75 },
  { key: '2026-06-08', label: '08/06', revenue: 0, signups: 0, enrollments: 0, passRate: null },
  { key: '2026-06-09', label: '09/06', revenue: 50000, signups: 1, enrollments: 3, passRate: 50 },
];

describe('AdminStatsChart', () => {
  it('renders the chart with the four series legends', () => {
    const { container, getByText } = render(<AdminStatsChart data={sample} />);
    // Mounts an SVG (recharts) without throwing.
    expect(container.querySelector('svg')).not.toBeNull();
    // Legend labels for each metric are present.
    expect(getByText('Doanh thu')).toBeInTheDocument();
    expect(getByText('Đăng ký mới')).toBeInTheDocument();
    expect(getByText('Ghi danh')).toBeInTheDocument();
    expect(getByText('Tỉ lệ đậu')).toBeInTheDocument();
  });
});
