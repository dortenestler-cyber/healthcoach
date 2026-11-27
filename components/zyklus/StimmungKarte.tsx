"use client";

import { DivergingBars, LineBand } from "@/components/charts";
import { Details } from "@/components/ui/Pille";
import type { Data } from "@/lib/insights";
import { PHASE_GROUP_LABEL } from "@/lib/cycle";
import { GROUPS, MIN_DAYS, moodByHabit, moodByPhase, moodSentence, moodSeries, moodWord } from "@/lib/stimmung";

const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const short = (iso: string) => `${Number(iso.slice(8, 10))}. ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PHASE_NAME = { menstruation: "Menstruation", follikel: "Follikelphase", eisprung: "Eisprung", luteal: "Lutealphase" } as const;

// Abschnitt „Stimmung“ auf der Seite Zyklus: Verlauf mit Phasenleiste, Schnitt je Phase, Gewohnheiten gegen die Stimmung am Tag danach.
// Die Daten kommen von ZyklusPage (Data mit dem langen Tagebuch).
export default function StimmungKarte({ today, data }: { today: string; data: Data }) {
  const rows = moodByPhase(data);
  const series = moodSeries(data, today, 90);
  const nCheckins = data.checkins.filter((c) => c.mood !== null).length;
  const habits = moodByHabit(data);
  const habitRows = habits.flatMap((h) =>
    (["follikel", "luteal"] as const).map((g) => ({ h, g, c: h.byGroup[g] })).filter((x) => x.c.diff !== null).map((x) => ({
      label: h.label,
      g: x.g,
      value: x.c.diff,
      note: `${PHASE_NAME[x.g]} · ${x.c.nWith} Tage mit, ${x.c.nWithout} ohne`,
    })),
  );
  const waiting = habits.filter((h) => GROUPS.every((g) => h.byGroup[g].diff === null)).map((h) => h.label);
  const top = [...habitRows].sort((a, b) => Math.abs(b.value as number) - Math.abs(a.value as number))[0];
  const habitSentence = top && Math.abs(top.value as number) >= 0.3
    ? `Am Tag nach „${top.label}“ ist deine Stimmung ${(top.value as number) > 0 ? "höher" : "niedriger"} als sonst (${PHASE_NAME[top.g]}).`
    : habitRows.length
      ? "Bisher hängt keine Gewohnheit deutlich mit deiner Stimmung am nächsten Tag zusammen."
      : `Gewohnheiten gegen die Stimmung erscheinen ab je ${MIN_DAYS} Tagen mit und ohne in einer Phase.`;

  return (
    <section className="card">
      <span className="meta">Stimmung · Check-in und Symptome je Phase</span>
      <h2>{moodSentence(rows, (g) => PHASE_NAME[g])}</h2>

      {nCheckins >= MIN_DAYS * 2 ? (
        <LineBand
          values={series.values}
          fmt={(v) => `${de1(v)} · ${moodWord(v)}`}
          tone="cycle"
          phases={series.phases}
          dates={series.days}
          label={`Stimmung der letzten 90 Tage als 7-Tage-Schnitt von 1 niedrig bis 3 gut, mit Zyklusphasen`}
          xLabels={[{ index: 0, text: short(series.days[0]) }, { index: series.days.length - 1, text: short(series.days[series.days.length - 1]) }]}
          height={160}
        />
      ) : (
        <p>Der Verlauf erscheint ab {MIN_DAYS * 2} Check-ins mit Stimmung (bisher {nCheckins}).</p>
      )}

      {rows.map((r) => (
        <div key={r.group} className="card-row list-line">
          <div className="stack">
            <span className="row-strong">{PHASE_GROUP_LABEL[r.group]}</span>
            <span className="meta">
              {r.nMood} Check-ins{r.lowShare !== null ? ` · Stimmungs-Symptome an ${Math.round(r.lowShare * r.nDiary)} von ${r.nDiary} Tagen` : ` · ${r.nDiary} Tage im Tagebuch`}
            </span>
          </div>
          <span className="range-row-value">{r.mood === null ? "–" : `${de1(r.mood)} · ${moodWord(r.mood)}`}</span>
        </div>
      ))}

      <Details id="zyklus.stimmung-gewohnheiten" label="Gewohnheiten und Stimmung am Tag danach">
        <h3 className="card-title-lg">{habitSentence}</h3>
        {habitRows.length > 0 && (
          <DivergingBars
            fmt={(v) => de1(v)}
            scaleMin={0.5}
            neg="Stimmung niedriger"
            pos="Stimmung höher"
            tone="cycle"
            label={`Stimmung am Tag nach einer Gewohnheit je Phase: ${habitRows.map((r) => `${r.label}, ${r.note}, ${(r.value as number) > 0 ? "plus" : "minus"} ${de1(Math.abs(r.value as number))}`).join("; ")}`}
            rows={habitRows.map(({ label, value, note }) => ({ label, value, note }))}
          />
        )}
        {waiting.length > 0 && <span className="meta">Noch zu wenige Tage: {waiting.join(", ")}.</span>}
      </Details>
    </section>
  );
}
