import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { ErrorAlert } from './ErrorAlert';

describe('Button', () => {
  it('renders children and defaults to type="button"', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('loading disables the button and sets aria-busy', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies variant + size classes and merges custom className', () => {
    render(
      <Button variant="danger" size="sm" className="custom-x">
        Del
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-red-400/30');
    expect(btn.className).toContain('text-[11px]');
    expect(btn.className).toContain('custom-x');
  });
});

describe('Badge', () => {
  it('renders content with the requested tone', () => {
    render(<Badge tone="info">Đã đăng ký</Badge>);
    const el = screen.getByText('Đã đăng ký');
    expect(el.className).toContain('text-cyan-200');
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState
        title="Chưa có khoá học"
        description="Hãy khám phá danh mục."
        action={<Button>Khám phá</Button>}
      />,
    );
    expect(screen.getByText('Chưa có khoá học')).toBeInTheDocument();
    expect(screen.getByText('Hãy khám phá danh mục.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khám phá' })).toBeInTheDocument();
  });
});

describe('ErrorAlert', () => {
  it('exposes role="alert" and the message', () => {
    render(<ErrorAlert message="Đã xảy ra lỗi" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Đã xảy ra lỗi');
  });

  it('renders a retry button that fires onRetry', () => {
    const onRetry = vi.fn();
    render(<ErrorAlert message="Lỗi mạng" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
