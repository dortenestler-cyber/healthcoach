import Link from "next/link";

export type HeadTone = "heute" | "zyklus" | "training" | "gesundheit";

// Seitenkopf mit Zahnrad zu den Einstellungen (auf der Einstellungsseite selbst ausgeblendet).
// Mit `tone` liegt ein Farbverlauf in der Bereichsfarbe hinter dem Kopf (Konzept dunkel 2, Muster 10).
// Mit `kalender` steht links neben dem Zahnrad ein Kalender-Symbol, das den zentralen Kalender
// mit den Ebenen dieses Bereichs öffnet (Konzept docs/konzept-einfach.md, Paket 3).
export default function PageHead({ title, sub, gear = true, tone, kalender }: { title: string; sub: string; gear?: boolean; tone?: HeadTone; kalender?: string }) {
  return (
    <header className="page-head">
      {tone && <div className="page-glow" data-tone={tone} aria-hidden="true" />}
      <div className="page-head-row">
        <div className="page-head-text">
          <span className="page-sub">{sub}</span>
          <h1 className="page-title">{title}</h1>
        </div>
        {(kalender || gear) && (
          <div className="page-head-actions">
        {kalender && (
          <Link href={`/kalender?von=${kalender}`} className="gear-btn" aria-label="Kalender öffnen">
            <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
          </Link>
        )}
        {gear && (
          <Link href="/einstellungen" className="gear-btn" aria-label="Einstellungen">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        )}
          </div>
        )}
      </div>
    </header>
  );
}
