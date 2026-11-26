import type { ReactNode } from "react";
import ExplainCard, { type ExplainTone } from "@/components/ui/ExplainCard";
import { estWord, PHASES, windowText, type DayRule } from "@/lib/cycle";
import { energyDay, usualRhythm } from "@/lib/energie";
import { dayLoad, type Data } from "@/lib/insights";
import { stressDay, stressSentence } from "@/lib/stress";
import { sleepScore } from "@/lib/schlaf";
import { hm, readinessFactors, readinessWhy, sleepAchieved, sleepNeed, targetText } from "@/lib/today";
import { weekIntensity, WHO_MINUTES } from "@/lib/trainingLoad";

const de1 = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clockOf = (min: number) => {
  const m = ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

type Props = { focus: string; day: string; data: Data; rule: DayRule; nowMinute: number; isToday: boolean; showLoad: boolean };
type Sentence = { tone: ExplainTone; question?: string; body: ReactNode };

// Ein Satz zum Tag (Konzept Heute als Einstiegsseite, Abschnitt 3). Der Text gehört zum Ring in der Mitte der Ringreihe,
// am Computer zu Readiness. Bei Warnzeichen steht hier nur der Hinweis auf ärztliche Abklärung.
export default function DaySentence(p: Props) {
  const { rule } = p;
  if (rule.level === "warnzeichen") {
    return (
      <div className="suggest suggest-warn day-sentence" role="alert">
        <span className="row-strong">{rule.title}</span>
        <span>{rule.text}</span>
      </div>
    );
  }

  const s = sentenceFor(p);
  return (
    <div className="day-sentence">
      <div className="day-sentence-fade" key={p.focus}>
        <ExplainCard tone={s.tone} question={s.question}>
          {s.body}
        </ExplainCard>
      </div>
    </div>
  );
}

function sentenceFor(p: Props): Sentence {
  switch (p.focus) {
    case "energie":
      return energySentence(p);
    case "schlaf":
      return sleepSentence(p);
    case "belastung":
      return loadSentence(p);
    case "stress":
      return stressText(p);
    case "zyklus":
      return cycleSentence(p);
    case "intensitaet":
      return intensitySentence(p);
    default:
      return readinessSentence(p);
  }
}

function readinessSentence({ day, data, rule, showLoad }: Props): Sentence {
  const { value, label, missing } = rule.readiness;
  if (missing) return { tone: "recovery", body: "Für heute fehlen HRV, Ruhepuls und Schlaf. Nach dem nächsten Synchronisieren gibt es wieder eine Readiness." };
  const reason = readinessWhy(readinessFactors(day, data), label)?.replace(/ Darum heute „[^“]+“\.$/, "") ?? null;
  const t = rule.target;
  const phase = rule.cycle.phase ? PHASES[rule.cycle.phase] : null;
  return {
    tone: "recovery",
    question: `Was heißt meine Readiness von ${de1(value)} („${label}“) für heute?`,
    body: (
      <>
        Heute <strong>{label}</strong>. {reason ? reason + " " : ""}
        {rule.level === "phase" ? (
          phase ? (
            <>
              {phase.label} {estWord(rule.cycle)}: {phase.suggestion}.
            </>
          ) : null
        ) : (
          <>
            <strong>{rule.title}.</strong> {rule.text}
          </>
        )}
        {showLoad && !t.pause && (
          <>
            {" "}
            Dein Belastungsziel: <strong>{t.lo}–{t.hi} %</strong>.
          </>
        )}
      </>
    ),
  };
}

function energySentence({ day, data, nowMinute, isToday }: Props): Sentence {
  const e = energyDay(day, data.daily, data.acts, nowMinute);
  const last = [...e.today].reverse().find((v) => v !== null) ?? null;
  if (last === null) return { tone: "energy", body: `Für ${isToday ? "heute" : "diesen Tag"} gibt es noch keinen Wert für die Body Battery.` };
  const v = Math.round(last);
  const usual = isToday ? e.usual[e.nowSlot] : null;
  const charged = data.daily.find((d) => d.day === day)?.bb_charged ?? null;
  const rhythm = usualRhythm(e.usual);
  const cmp = usual === null ? "" : Math.abs(v - usual) < 5 ? ", etwa wie üblich um diese Zeit" : v < usual ? ", unter deinem üblichen Wert um diese Zeit" : ", über deinem üblichen Wert um diese Zeit";
  const peakAhead = rhythm && isToday && nowMinute < rhythm.peak[1] * 60;
  return {
    tone: "energy",
    question: `Was heißt meine Body Battery von ${v} für ${isToday ? "heute" : "diesen Tag"}?`,
    body: (
      <>
        Body Battery {isToday ? "jetzt" : "am Ende des Tages"} <strong>{v}</strong>
        {cmp}.{" "}
        {charged !== null && charged > 0 && (
          <>
            Über Nacht <strong>+{Math.round(charged)}</strong> geladen.{" "}
          </>
        )}
        {rhythm && (
          <>
            Dein Hoch liegt meist zwischen {rhythm.peak[0]} und {rhythm.peak[1]} Uhr{peakAhead ? ", eine harte Einheit passt eher in diese Zeit." : "."}
          </>
        )}
      </>
    ),
  };
}

function sleepSentence({ day, data, isToday }: Props): Sentence {
  const s = sleepAchieved(day, data);
  if (s.hours === null) return { tone: "sleep", body: "Für letzte Nacht gibt es noch keinen Schlafwert." };
  const sc = sleepScore(day, data);
  const pct = sc.total;
  const awake = data.daily.find((d) => d.day === day)?.awake_count ?? null;
  const tonight = sleepNeed(day, data.daily, data.acts);
  const wakes = data.daily
    .filter((d) => d.day <= day && d.sleep_end_min != null)
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 14)
    .map((d) => d.sleep_end_min as number);
  const wake = wakes.length >= 3 ? median(wakes) : null;
  return {
    tone: "sleep",
    question: pct === null ? undefined : `Was heißt mein Schlafwert von ${pct} für ${isToday ? "heute" : "diesen Tag"}?`,
    body: (
      <>
        <strong>{hm(s.hours)}</strong> von <strong>{hm(s.need.gradeH)}</strong> Bedarf{awake ? `, ${awake}-mal wach` : ""}.{" "}
        {tonight.debtH >= 0.25 ? (
          <>
            Schlafschuld aus 7 Nächten: <strong>{hm(tonight.debtH)}</strong>.{" "}
          </>
        ) : (
          "Keine Schlafschuld aus den letzten 7 Nächten. "
        )}
        {isToday && (
          <>
            Heute Nacht brauchst du etwa <strong>{hm(tonight.hours)}</strong>
            {wake !== null ? (
              <>
                , also gegen <strong>{clockOf(wake - tonight.hours * 60)}</strong> ins Bett.
              </>
            ) : (
              "."
            )}
          </>
        )}
      </>
    ),
  };
}

function loadSentence({ day, data, rule, isToday }: Props): Sentence {
  const dl = dayLoad(day, data.daily, data.acts);
  const t = rule.target;
  const past = dl.pct < t.lo ? "Damit lag der Tag unter dem Ziel." : dl.pct <= t.hi ? "Damit lag der Tag im Ziel." : "Damit lag der Tag über dem Ziel.";
  return {
    tone: "training",
    question: t.pause ? undefined : `Meine Belastung liegt ${isToday ? "heute" : "an diesem Tag"} bei ${dl.pct} % (Ziel ${t.lo}–${t.hi} %). Was heißt das für mein Training?`,
    body: (
      <>
        {isToday ? "Heute" : "An diesem Tag"} <strong>{dl.pct} %</strong>
        {dl.quelle ? `, davon ${dl.pctTraining} % Training und ${dl.pctAlltag} % Alltag` : ""}.{" "}
        {!t.pause && (
          <>
            Dein Ziel: <strong>{t.lo}–{t.hi} %</strong>.{" "}
          </>
        )}
        {isToday || t.pause ? targetText(t, dl.pct) : past}
      </>
    ),
  };
}

function stressText({ day, data, isToday }: Props): Sentence {
  const s = stressDay(day, data.daily);
  if (s.value === null || !s.word) return { tone: "stress", body: `Für ${isToday ? "heute" : "diesen Tag"} gibt es noch keinen Stresswert.` };
  const cmp = s.usual === null ? "" : Math.abs(s.value - s.usual) < 5 ? `, so ruhig wie ein üblicher ${s.weekday}` : s.value < s.usual ? `, ruhiger als ein üblicher ${s.weekday}` : `, angespannter als ein üblicher ${s.weekday}`;
  return {
    tone: "stress",
    question: `Mein Stress liegt ${isToday ? "heute" : "an diesem Tag"} bei ${s.value} (${s.word}). Was kann ich dagegen tun?`,
    body: (
      <>
        Im Schnitt <strong>{s.value}</strong>, {s.word.toLowerCase()}
        {cmp}. {s.split ? stressSentence(s) : ""}
      </>
    ),
  };
}

function cycleSentence({ day, rule }: Props): Sentence {
  const c = rule.cycle;
  if (c.cycleDay === null) return { tone: "cycle", body: "Trag den Beginn deiner Periode im Tagebuch ein, dann zeigt der Ring deinen Zyklustag." };
  const phase = c.phase ? PHASES[c.phase] : null;
  return {
    tone: "cycle",
    question: phase ? `Was ist in ${phase.inPhase} üblich und was tut mir jetzt gut?` : undefined,
    body: (
      <>
        Zyklustag <strong>{c.cycleDay}</strong> von etwa {c.length}
        {phase ? (
          <>
            , <strong>{phase.label}</strong> {estWord(c)}
          </>
        ) : null}
        .{" "}
        {phase && (
          <>
            {phase.pattern} Gut passt: {phase.suggestion}.{" "}
          </>
        )}
        {c.window ? windowText(c.window, day) + "." : ""}
      </>
    ),
  };
}

function intensitySentence({ day, data, rule, isToday }: Props): Sentence {
  const im = weekIntensity(day, data);
  const rest = WHO_MINUTES - im;
  return {
    tone: "training",
    question: `Ich habe diese Woche ${im} Intensitätsminuten. Wie verteile ich den Rest sinnvoll?`,
    body: (
      <>
        {isToday ? "Diese Woche" : "In dieser Woche bis zu diesem Tag"} <strong>{im}</strong> von <strong>{WHO_MINUTES}</strong> Intensitätsminuten.{" "}
        {rest <= 0 ? (
          "Die Empfehlung der WHO ist erreicht. "
        ) : rule.target.pause ? (
          "Heute ist Erholung dran, die Minuten können warten. "
        ) : (
          <>
            Noch <strong>{rest} min</strong> bis zur Empfehlung der WHO, zum Beispiel {Math.ceil(rest / 30)} × 30 Minuten zügig.{" "}
          </>
        )}
        Garmin zählt intensive Minuten doppelt.
      </>
    ),
  };
}
