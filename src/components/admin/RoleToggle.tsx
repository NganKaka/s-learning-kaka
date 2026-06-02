/**
 * Role toggle switch component.
 */
interface RoleToggleProps {
  active: boolean;
  loading: boolean;
  onClick: () => void;
}

export function RoleToggle({ active, loading, onClick }: RoleToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-8 h-5 rounded-full transition-colors relative ${active ? 'bg-emerald-500/40' : 'bg-white/10'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
          active ? 'left-3.5 bg-emerald-300' : 'left-0.5 bg-secondary/50'
        }`}
      />
    </button>
  );
}
