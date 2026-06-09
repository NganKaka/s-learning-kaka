import { User } from 'lucide-react';

/** User avatar — image when available, otherwise initials. Shared by the
 *  desktop UserMenu dropdown and the mobile menu header. */
export default function Avatar({
  displayName,
  avatarUrl,
  large,
}: {
  displayName: string | null;
  avatarUrl: string | null;
  large?: boolean;
}) {
  const size = large ? 36 : 28;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="rounded-full border border-cyan-300/30 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials =
    (displayName ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-primary/30 to-cyan-400/20 font-headline font-bold text-on-surface"
      style={{ width: size, height: size, fontSize: large ? 13 : 11 }}
    >
      {initials || <User size={14} />}
    </span>
  );
}
