// Tagesübersicht für die Uhr und den Tagesstart (Funktion push): Readiness, Plan, Einnahmen, Zyklus.
import { asDay, cycleInfo, dayLoadPct, periodStarts, phaseShort, sickDays, targetScore, usualLoad } from "./target.ts";
import { fitnessAge, waistOn } from "./fitness.ts";
import { sleepTotal } from "./schlaf.ts";

const TZ = "Europe/Berlin";
const localTime = (d = new Date()) => new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const SPORT_LABEL: Record<string, string> = { karate: "KARATE", kettlebell: "KETTLEBELL", klettern: "BOULDERN", ausdauer: "AUSDAUER", sonstiges: "TRAINING" };
// deno-lint-ignore no-explicit-any
type Any = any;

// Alles, was die Uhr für heute braucht, kompakt und in Großbuchstaben für das Datenraster
export async function today(sb: Any, uid: string, day: string) {
  const [meds, intakes, flashes, checkin, plan, illness, injuries, daily, kbPlan, diary, gcycles, settings, body, acts, ills, drinkRows] = await Promise.all([
    sb.from("medications").select("id, name, kind, regular, as_needed, times, notes_key").eq("user_id", uid).eq("active", true).order("created_at"),
    sb.from("medication_intakes").select("medication_id, as_needed, slot, day, at").eq("user_id", uid).gte("day", addDays(day, -6)),
    sb.from("hot_flashes").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("at", new Date(Date.now() - 864e5).toISOString()),
    sb.from("checkins").select("energy, sleep, mood").eq("user_id", uid).eq("day", day).maybeSingle(),
    sb.from("planned_sessions").select("sport, time, status").eq("user_id", uid).eq("day", day).neq("status", "ausgelassen"),
    sb.from("illnesses").select("label, kind, severity, fever, below_neck").eq("user_id", uid).is("ended_on", null).limit(1),
    sb.from("injuries").select("spot").eq("user_id", uid).is("ended_on", null),
    // Alle Spalten, damit neue Spalten (z. B. Fitness-Alter) fehlen dürfen, ohne dass die Abfrage scheitert
    sb.from("garmin_daily").select("*").eq("user_id", uid).gte("day", addDays(day, -179)).order("day"),
    sb.from("kb_plans").select("id, name, weeks, step_kg, step_every_weeks, start_date").eq("user_id", uid).eq("active", true).order("created_at", { ascending: false }).limit(1),
    sb.from("diary_entries").select("day, bleeding, symptoms").eq("user_id", uid).gte("day", addDays(day, -179)).order("day"),
    // Zyklen aus Garmin; die Tabelle gibt es erst nach der SQL aus PR #14, bis dahin wird sie übersprungen
    sb.from("garmin_cycles").select("start_date").eq("user_id", uid).gte("start_date", addDays(day, -179)).lte("start_date", day),
    // Für das eigene Fitness-Alter: Geburtsjahr, Bauchumfang, Einheiten der letzten 4 Wochen, Krankheiten
    sb.from("settings").select("data").eq("user_id", uid).maybeSingle(),
    sb.from("body_measurements").select("day, waist_cm").eq("user_id", uid).gte("day", addDays(day, -179)).order("day"),
    sb.from("garmin_activities").select("*").eq("user_id", uid).gte("start_local", addDays(day, -30)), // alle Spalten: rpe, Sportart (Muskelrechnung)
    // Krankheiten: für das Fitness-Alter (4 Wochen) und damit kranke Tage nicht in die Bereiche der Readiness zählen (150 Tage)
    sb.from("illnesses").select("started_on, ended_on").eq("user_id", uid).or(`ended_on.is.null,ended_on.gte.${addDays(day, -179)}`),
    // Getränke von heute (Tabelle ab Migration 20261203090000; fehlt sie noch, bleibt die Liste leer)
    sb.from("drink_log").select("at, kind, amount").eq("user_id", uid).eq("day", day).order("at"),
  ]);

  const ins = (intakes.data ?? []) as Any[];
  const todayIns = ins.filter((i) => i.day === day);
  const medList = (meds.data ?? []) as Any[];

  // Regelmäßige Einnahmen: Medikamente einzeln, Supplements je Uhrzeit gebündelt
  const slots: Any[] = [];
  for (const m of medList.filter((x) => x.regular && x.kind === "medikament")) {
    for (const t of m.times?.length ? m.times : ["TÄGLICH"]) {
      slots.push({ label: String(m.name).replace(" Easyhaler", "").toUpperCase(), slot: t, ids: [m.id], bufori: m.notes_key === "bufori", done: todayIns.some((i) => i.medication_id === m.id && !i.as_needed && i.slot === t) });
    }
  }
  const supp = new Map<string, Any[]>();
  for (const m of medList.filter((x) => x.regular && x.kind === "supplement")) for (const t of m.times?.length ? m.times : ["TÄGLICH"]) supp.set(t, [...(supp.get(t) ?? []), m]);
  for (const [t, list] of supp) slots.push({ label: "SUPPLEMENTS", slot: t, ids: list.map((m: Any) => m.id), bufori: false, done: list.every((m: Any) => todayIns.some((i) => i.medication_id === m.id && !i.as_needed && i.slot === t)) });
  slots.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));

  const needed = medList.filter((m) => m.as_needed).map((m) => ({
    id: m.id,
    label: String(m.name).replace(" Easyhaler", "").toUpperCase(),
    today: todayIns.filter((i) => i.medication_id === m.id && i.as_needed).length,
    week: ins.filter((i) => i.medication_id === m.id && i.as_needed).length,
    bufori: m.notes_key === "bufori",
  }));

  // Kettlebell: Zielgewichte dieser Woche wie in der App
  let kb: Any = null;
  const p = ((kbPlan.data ?? []) as Any[])[0];
  if (p) {
    const { data: items } = await sb.from("kb_plan_items").select("exercise, sets, reps, weight_kg, per_side").eq("plan_id", p.id).order("pos");
    const days = Math.floor((new Date(day).getTime() - new Date(p.start_date).getTime()) / 864e5);
    const week = Math.max(1, Math.min(p.weeks, Math.floor(days / 7) + 1));
    const steps = Math.floor((week - 1) / Math.max(1, p.step_every_weeks));
    kb = {
      plan_id: p.id,
      name: String(p.name).toUpperCase(),
      week,
      items: ((items ?? []) as Any[]).map((it) => ({
        exercise: it.exercise,
        label: String(it.exercise).toUpperCase(),
        sets: it.sets,
        reps: it.reps,
        kg: it.weight_kg === 0 ? 0 : Math.min(20, it.weight_kg + steps * p.step_kg),
        per_side: it.per_side,
      })),
    };
  }

  // Zyklustag wie in der App: Tagebuch zuerst, Garmin-Zyklen ergänzen
  const di = (diary.data ?? []) as Any[];
  const garminStarts = (gcycles.error ? [] : gcycles.data ?? []).map((c: Any) => String(c.start_date));
  const starts = periodStarts(di, garminStarts);
  const cyc = cycleInfo(day, starts);
  const cycleDay = cyc.cycleDay;

  const ill = ((illness.data ?? []) as Any[])[0] ?? null;
  const pause = !!ill && (ill.fever || ill.below_neck || ill.severity >= 4);
  const blockedClimb = ((injuries.data ?? []) as Any[]).some((i) => ["finger", "hand", "schulter", "fuss"].includes(i.spot));
  const days = (daily.data ?? []) as Any[];
  const g = days.find((r) => r.day === day) ?? null;
  // Tagesziel "Belastung heute" 0–100, wie in der App
  const sick = sickDays((ills.data ?? []) as Any[], day);
  const sleep = sleepTotal(day, days, (acts.data ?? []) as Any[], starts, sick, new Map());
  const target = targetScore(day, days.map(asDay), di, (checkin.data ?? null) as Any, ill, starts, sick, usualLoad(day, days, (acts.data ?? []) as Any[], sick), sleep, days, (acts.data ?? []) as Any[]);
  // Eigenes Fitness-Alter (HUNT-Modell, wie in der App)
  const by = (settings.data as Any)?.data?.birthYear;
  const w = waistOn(((body.data ?? []) as Any[]).map((r) => ({ day: r.day, waist_cm: r.waist_cm === null ? null : Number(r.waist_cm) })), day);
  const fit = fitnessAge({
    birthYear: typeof by === "number" ? by : null,
    waist: w?.value ?? null,
    days: days.map((r) => ({ day: r.day, resting_hr: r.resting_hr ?? null })),
    acts: (acts.data ?? []) as Any[],
    ill: (ills.data ?? []) as Any[],
    day,
  });
  const fa = fit?.fitnessAge ?? null;
  // Belastung bisher in Prozent, wie dayLoad in der App (lib/insights.ts)
  const load = dayLoadPct(day, g, (acts.data ?? []) as Any[]);

  // Getränke: Wasser in Litern, Kaffee/Tee/Alkohol als Anzahl; Kaffee mit Uhrzeit als Dezimalstunde (Berlin) für die Zeitleiste
  const drinks = (drinkRows.error ? [] : drinkRows.data ?? []) as Any[];
  const sumOf = (k: string) => Math.round(drinks.filter((d) => d.kind === k).reduce((a, d) => a + Number(d.amount), 0) * 100) / 100;
  const hourOf = (at: string) => {
    const [h, m] = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at)).split(":");
    return Math.round((Number(h) + Number(m) / 60) * 100) / 100;
  };
  const sd = (settings.data as Any)?.data ?? {};
  const trainingToday = ((plan.data ?? []) as Any[]).length > 0 || ((acts.data ?? []) as Any[]).some((a) => String(a.start_local ?? "").startsWith(day));
  const num = (v: unknown, d: number) => (typeof v === "number" && v > 0 && v <= 10 ? v : d);
  const waterGoal = trainingToday ? num(sd.waterGoalTraining, 2.5) : num(sd.waterGoal, 2);
  const lastDrink = drinks.length ? localTime(new Date(drinks[drinks.length - 1].at)) : null;

  return {
    day,
    time: localTime(),
    infection: !!target.infection,
    drinks: {
      water: sumOf("wasser"),
      goal: waterGoal,
      coffee: sumOf("kaffee"),
      tea: sumOf("tee"),
      alcohol: sumOf("alkohol"),
      coffeeAt: drinks.filter((d) => d.kind === "kaffee").map((d) => hourOf(d.at)),
      last: lastDrink,
    },
    flashes24h: flashes.count ?? 0,
    checkinDone: !!checkin.data,
    cycleDay,
    cycleLen: cyc.length, // für die Punkte der Zyklus-Spur auf dem Zifferblatt
    phase: phaseShort(cycleDay, cyc.length),
    goal: target.score,
    load,
    band: [target.lo, target.hi],
    factors: target.factors,
    fitnessAge: fa,
    rhr: g?.resting_hr ?? null,
    bb: g?.bb_max ?? null,
    hrv: g?.hrv_last_night ?? null,
    sleep, // eigener Schlafwert 0–100 (schlaf.ts), wie in der App
    illness: ill ? String(ill.label).toUpperCase() : null,
    pause,
    plan: ((plan.data ?? []) as Any[]).map((s) => ({
      label: SPORT_LABEL[s.sport] ?? "TRAINING",
      time: "", // Uhrzeiten im Plan entfallen (Nutzerin 25.11.); Feld bleibt für ältere Uhr-Versionen
      done: s.status === "erledigt",
      note: pause ? "PAUSE" : s.sport === "klettern" && blockedClimb ? "PAUSIERT" : "",
    })),
    slots,
    needed,
    kb,
  };
}
