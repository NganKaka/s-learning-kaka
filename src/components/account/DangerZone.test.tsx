import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

import DangerZone from './DangerZone';

function renderDz() {
  return render(
    <MemoryRouter>
      <DangerZone />
    </MemoryRouter>,
  );
}

describe('DangerZone delete gate', () => {
  it('hides the destructive action behind two gates (open + typed confirm)', () => {
    renderDz();
    // Gate 1: only the opener is visible; no permanent-delete button yet.
    expect(screen.queryByRole('button', { name: /Xoá vĩnh viễn/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Xoá tài khoản/i }));

    // Gate 2: delete is present but DISABLED until the confirm word is typed.
    const del = screen.getByRole('button', { name: /Xoá vĩnh viễn/i });
    expect(del).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/để xác nhận/i), { target: { value: 'wrong' } });
    expect(del).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/để xác nhận/i), { target: { value: 'XOÁ' } });
    expect(del).toBeEnabled();
  });
});
