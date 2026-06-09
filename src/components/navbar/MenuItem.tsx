import { Link } from 'react-router-dom';

/** A single row in the UserMenu dropdown. */
export default function MenuItem({
  to,
  icon: Icon,
  label,
  onClose,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClose: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClose}
      role="menuitem"
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
        accent ? 'text-cyan-300 hover:bg-cyan-400/10' : 'text-on-surface hover:bg-white/[0.04]'
      }`}
    >
      <Icon size={14} />
      {label}
    </Link>
  );
}
