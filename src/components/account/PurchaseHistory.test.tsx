import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { OrderWithCourse } from '../../lib/orders';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('../../lib/orders', () => ({ listMyOrders: vi.fn() }));

import { listMyOrders } from '../../lib/orders';
import PurchaseHistory from './PurchaseHistory';

const mockList = vi.mocked(listMyOrders);

const order = (over: Partial<OrderWithCourse>): OrderWithCourse =>
  ({
    id: 'o1',
    user_id: 'u1',
    course_id: 'c1',
    amount_vnd: 500000,
    payment_method: 'wallet',
    memo_code: 'ABC-123',
    status: 'confirmed',
    kind: 'purchase',
    confirmed_at: null,
    confirmed_by: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    course: { title: 'Toán 12', slug: 'toan-12' },
    ...over,
  }) as OrderWithCourse;

beforeEach(() => vi.clearAllMocks());

describe('PurchaseHistory', () => {
  it('shows a skeleton while loading (never-resolving fetch)', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<PurchaseHistory />);
    expect(screen.getByText('Lịch sử giao dịch')).toBeInTheDocument();
    expect(screen.queryByText(/Chưa có giao dịch/)).toBeNull();
  });

  it('shows an empty state when there are no orders', async () => {
    mockList.mockResolvedValue([]);
    render(<PurchaseHistory />);
    expect(await screen.findByText('Chưa có giao dịch nào')).toBeInTheDocument();
  });

  it('renders order rows with title, amount and status', async () => {
    mockList.mockResolvedValue([
      order({}),
      order({ id: 'o2', kind: 'topup', course: null, status: 'pending', amount_vnd: 100000 }),
    ]);
    render(<PurchaseHistory />);
    expect(await screen.findByText('Toán 12')).toBeInTheDocument();
    expect(screen.getByText('Nạp ví')).toBeInTheDocument();
    expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });
});
