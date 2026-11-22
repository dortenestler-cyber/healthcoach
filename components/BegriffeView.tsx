import Link from "next/link";
import PageHead from "@/components/PageHead";

// Kurze Erklärungen ohne Fachjargon. Keine Diagnosen, keine Normwerte als Urteil.
const TERMS: { term: string; text: string; tip: string }[] = [
  {
    term: "HRV (Herzfrequenzvariabilität)",
    text: "Dein Herz schlägt nicht wie ein Uhrwerk. Die Abstände zwischen den Schlägen schwanken leicht. Die HRV misst, wie stark. Gemessen wird sie in der Nacht.",
    tip: "Höher als sonst heißt meist: gut erholt. Niedriger als sonst kann auf Stress, wenig Schlaf, Alkohol, Infekt oder die zweite Zyklushälfte hindeuten. Vergleiche nur mit deinen eigenen Werten.",
  },
  {
    term: "Body Battery",
    text: "Ein Wert von Garmin zwischen 0 und 100. Er schätzt, wie viel Energie du gerade hast. Schlaf und Ruhe laden auf, Training und Stress verbrauchen.",
    tip: "Morgens zeigt er, wie gut die Nacht dich aufgeladen hat. Es ist eine Schätzung der Uhr, kein Messwert.",
  },
  {
    term: "Ruhepuls",
    text: "So oft schlägt dein Herz pro Minute, wenn du ganz ruhig bist, meist im Schlaf gemessen.",
    tip: "Liegt er ein paar Schläge über deinem üblichen Wert, ist der Körper oft noch beschäftigt, etwa mit Erholung, einem Infekt oder Hitze. Ein Tag allein sagt wenig, der Trend zählt.",
  },
  {
    term: "Schlafphasen",
    text: "Die Uhr teilt die Nacht in leichten Schlaf, Tiefschlaf, REM-Schlaf (Traumschlaf) und Wachphasen ein.",
    tip: "Tiefschlaf hilft dem Körper bei der Erholung, REM-Schlaf dem Kopf. Die Uhr schätzt die Phasen über Puls und Bewegung, die Gesamtdauer ist verlässlicher als die einzelnen Phasen.",
  },
  {
    term: "Trainingslast",
    text: "Fasst zusammen, wie anstrengend dein Training war, aus Dauer und Puls. Eine Woche mit viel Last braucht danach mehr Erholung.",
    tip: "Hilfreich ist der Vergleich mit den letzten Wochen: Steigt die Last plötzlich stark, steigt auch das Risiko für Überlastung.",
  },
  {
    term: "Readiness",
    text: "Die Tagesempfehlung von Health Coach: Wie viel Belastung passt heute? Sie fasst HRV, Ruhepuls, Schlaf, Check-in, Zyklus und Verletzungen zusammen.",
    tip: "Eine Orientierung, keine Vorschrift. Wie du dich fühlst, zählt mit.",
  },
];

export default function BegriffeView() {
  return (
    <>
      <PageHead title="Begriffe" sub="Kurz erklärt" />
      {TERMS.map((t) => (
        <section key={t.term} className="card">
          <h2>{t.term}</h2>
          <p>{t.text}</p>
          <p className="meta">{t.tip}</p>
        </section>
      ))}
      <p className="settings-note">
        Bei anhaltenden Auffälligkeiten oder Beschwerden bitte ärztlich abklären lassen. <Link href="/einstellungen">Zurück zu den Einstellungen</Link>
      </p>
    </>
  );
}
