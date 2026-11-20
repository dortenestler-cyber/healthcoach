// Platzhalter für Bereiche, die in einer späteren Phase gebaut werden.
export default function Placeholder({ items, phase }: { items: string[]; phase: string }) {
  return (
    <>
      {items.map((item) => (
        <section key={item} className="card">
          <h2>{item}</h2>
          <p>Kommt in {phase}.</p>
        </section>
      ))}
      <span className="hint">Grundgerüst · noch ohne Daten</span>
    </>
  );
}
