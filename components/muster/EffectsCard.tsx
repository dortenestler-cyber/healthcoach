import { DivergingBars } from "@/components/charts";
import type { Data } from "@/lib/insights";
import { hrvEffects, MIN_NIGHTS } from "@/lib/muster";

const ms = (v: number) => `${Math.round(v)} ms`;

// Was dir guttut: HRV in der Nacht danach, Tage mit Einfluss gegen Tage ohne. Erst ab je 5 Nächten. Ohne Netzwerk.
export default function EffectsCard({ data }: { data: Data }) {
  const effects = hrvEffects(data);
  const ready = effects.filter((e) => e.diff !== null);
  const best = [...ready].sort((a, b) => (b.diff as number) - (a.diff as number))[0];
  const worst = [...ready].sort((a, b) => (a.diff as number) - (b.diff as number))[0];
  let sentence = `Zusammenhänge erscheinen ab je ${MIN_NIGHTS} Nächten mit und ohne einen Einfluss.`;
  if (ready.length) {
    const up = best && (best.diff as number) >= 2 ? best : null;
    const down = worst && worst !== best && (worst.diff as number) <= -2 ? worst : null;
    if (up && down) sentence = `Nach Tagen mit „${up.label}“ liegt deine HRV in der Nacht danach ${ms(up.diff as number)} höher, nach „${down.label}“ ${ms(-(down.diff as number))} niedriger.`;
    else if (up) sentence = `Nach Tagen mit „${up.label}“ liegt deine HRV in der Nacht danach ${ms(up.diff as number)} höher.`;
    else if (down) sentence = `Nach Tagen mit „${down.label}“ liegt deine HRV in der Nacht danach ${ms(-(down.diff as number))} niedriger.`;
    else sentence = "Bisher zeigt keiner der Einflüsse einen deutlichen Unterschied bei der HRV.";
  }

  return (
    <section className="card">
      <span className="meta">Was dir guttut · HRV in der Nacht danach</span>
      <h2>{sentence}</h2>
      <DivergingBars
        fmt={ms}
        label={`HRV in der Nacht danach, mit gegen ohne: ${effects.map((e) => `${e.label} ${e.diff === null ? "noch zu wenige Nächte" : `${e.diff > 0 ? "plus" : "minus"} ${ms(Math.abs(e.diff))}`}`).join(", ")}`}
        rows={effects.map((e) => ({
          label: e.label,
          value: e.diff,
          note: e.diff === null ? `${e.withN} von ${MIN_NIGHTS} Nächten` : `${e.withN} mit · ${e.withoutN} ohne`,
        }))}
      />
      <span className="meta">Aus deinen Tagebuch-Einträgen und Garmin-Daten. Ein Zusammenhang, keine Empfehlung und kein Beweis.</span>
    </section>
  );
}
