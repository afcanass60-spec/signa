/** Logo : deux mains stylisées (gauche orange, droite bleue) qui se rejoignent. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 24c0-7 3-13 8-16" fill="none" stroke="var(--hand-left)" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 24c0-7-3-13-8-16" fill="none" stroke="var(--hand-right)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="6.5" r="3" fill="var(--ink)" />
    </svg>
  );
}
