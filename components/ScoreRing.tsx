/** Note sur 100 sous forme d'anneau. */
export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const color = score >= 80 ? "var(--ok)" : score >= 55 ? "var(--warn)" : "var(--bad)";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Note : ${score} sur 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fill="var(--ink)"
        style={{ font: "800 34px var(--font-display)" }} className="tabular">
        {score}
      </text>
      <text x="60" y="86" textAnchor="middle" fill="var(--muted)" style={{ font: "700 11px var(--font-sans)" }}>/ 100</text>
    </svg>
  );
}

export function SubBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "var(--ok)" : value >= 55 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, transition: "width 0.6s ease" }} />
      </div>
      <span className="tabular text-right font-bold">{value}</span>
    </div>
  );
}
