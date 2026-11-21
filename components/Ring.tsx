// Tagesziel-Ring: grauer Grund, Zielbereich hell, Belastung in Beere
export default function Ring({ load, lo, hi, size = 150 }: { load: number; lo: number; hi: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const arc = (from: number, to: number) => ({ strokeDasharray: `${(Math.max(0, to - from) / 100) * c} ${c}`, strokeDashoffset: `${(-from / 100) * c}` });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Belastung ${load} Prozent, Ziel ${lo} bis ${hi} Prozent`}>
      <g transform="rotate(-90 50 50)" fill="none" strokeWidth="9">
        <circle cx="50" cy="50" r={r} stroke="var(--line-soft)" />
        <circle cx="50" cy="50" r={r} stroke="#f2d3de" style={arc(lo, hi)} />
        <circle cx="50" cy="50" r={r} stroke="var(--accent)" strokeLinecap="round" style={arc(0, Math.max(load, 0.5))} />
      </g>
      <text x="50" y="50" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text)">{load} %</text>
      <text x="50" y="64" textAnchor="middle" fontSize="7.5" fill="var(--muted)">Belastung bisher</text>
    </svg>
  );
}
