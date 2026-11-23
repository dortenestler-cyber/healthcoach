"use client";

import { activityLabel } from "@/lib/garmin";
import { coachUnitLine } from "@/lib/trainingInsights";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { loadInsightData } from "@/lib/insightData";
import { computeTarget, cycleInfo, dayLoad, patterns } from "@/lib/insights";
import { cycleToday, PHASES } from "@/lib/cycle";
import { METRICS, stats } from "@/lib/garmin";
import { SPOTS, type Injury, type Medication } from "@/lib/health";
import { SPORTS, type Session } from "@/lib/training";
import { ALL_SYMPTOMS } from "@/lib/catalog";

// Kompakte Zusammenfassung für den Coach: Kennzahlen und Hinweise, keine Rohdaten
export async function buildCoachContext(): Promise<string> {
  const sb = supabase();
  const data = await loadInsightData(120);
  if (!sb || !data) return "";
  const day = isoDay();
  const lines: string[] = [`Datum: ${day}`];

  const t = computeTarget(day, data);
  lines.push(`Tagesziel: ${t.pause ? "Pause" : `${t.label} ${t.lo}–${t.hi} %`}, Belastung bisher ${(() => { const dl = dayLoad(day, data.daily, data.acts); return `${dl.pct} % (Training ${dl.pctTraining} %, Alltag ${dl.pctAlltag} %)`; })()}.`);
  for (const f of t.factors) lines.push(`- ${f.name}${f.value ? " " + f.value : ""}: ${f.note} (${f.effect >= 0 ? "+" : ""}${f.effect})`);

  // Garmin: Werte von heute (letzte Nacht), damit der Coach keine Zahlen raten muss
  const todayRow = data.daily.find((d) => d.day === day);
  if (todayRow) {
    const vals = (["schlaf", "hrv", "ruhepuls", "bb", "stress"] as const)
      .map((k) => { const v = METRICS[k].value(todayRow); return v === null ? null : `${METRICS[k].label} ${METRICS[k].fmt(v)}`; })
      .filter(Boolean);
    if (todayRow.sleep_score !== null) vals.unshift(`Schlafwert ${todayRow.sleep_score} von 100`);
    lines.push(vals.length ? `Heute (Garmin): ${vals.join(", ")}.` : "Heute: noch keine Garmin-Werte.");
  } else lines.push("Heute: noch keine Garmin-Werte synchronisiert.");

  // Garmin: letzte 7 Tage gegen 30 Tage
  const last7 = data.daily.filter((d) => d.day >= isoDay(daysAgo(6)));
  const last30 = data.daily.filter((d) => d.day >= isoDay(daysAgo(29)));
  for (const k of ["schlaf", "hrv", "ruhepuls", "bb"] as const) {
    const m = METRICS[k];
    const a = stats(last7.map(m.value).filter((v): v is number => v !== null));
    const b = stats(last30.map(m.value).filter((v): v is number => v !== null));
    if (a && b) lines.push(`${m.label}: Schnitt 7 Tage ${m.fmt(a.mean)}, 30 Tage ${m.fmt(b.mean)}.`);
  }

  const cyc = cycleInfo(day, data.diary);
  lines.push(cyc.cycleDay ? `Zyklustag ${cyc.cycleDay}, Zyklus etwa ${cyc.length} Tage${cyc.beforePeriod ? ", Tage vor der Periode" : ""}${cyc.fromGarmin ? " (Beginn aus Garmin)" : ""}.` : "Zyklus: noch keine Periode eingetragen.");
  const ct = cycleToday(day, data.diary);
  if (ct.phase) lines.push(`Geschätzte Phase: ${PHASES[ct.phase].label}.`);
  if (ct.window) lines.push(`Nächste Periode geschätzt zwischen ${ct.window.earliest} und ${ct.window.latest} (aus ${ct.window.basis} Zyklen).`);

  // Symptome der letzten 7 Tage
  const recent = data.diary.filter((d) => d.day >= isoDay(daysAgo(6)));
  const sym = ALL_SYMPTOMS.map((s) => ({ s, n: recent.filter((d) => (d.symptoms?.[s.key] ?? 0) > 0).length, max: Math.max(0, ...recent.map((d) => d.symptoms?.[s.key] ?? 0)) })).filter((x) => x.n);
  if (sym.length) lines.push("Symptome und Anzeichen letzte 7 Tage: " + sym.map((x) => `${x.s.label} an ${x.n} Tagen (bis ${["", "leicht", "mittel", "stark"][x.max]})`).join(", ") + ".");
  const flashes = await sb.from("hot_flashes").select("at", { count: "exact", head: true }).gte("at", daysAgo(6).toISOString());
  if (flashes.count) lines.push(`Hitzewallungen letzte 7 Tage: ${flashes.count}.`);

  // Aktivitäten letzte 14 Tage
  const acts = data.acts.filter((a) => (a.start_local ?? "") >= isoDay(daysAgo(13)));
  const unitLine = coachUnitLine(data.acts, data);
  if (unitLine) lines.push(unitLine);
  if (acts.length) lines.push("Aktivitäten letzte 14 Tage (Garmin): " + acts.map((a) => `${(a.start_local ?? "").slice(5, 10)} ${activityLabel(a)} ${Math.round((a.duration_s ?? 0) / 60)} min`).join("; ") + ".");

  const [meds, inj, plan, kb, climbs, settings] = await Promise.all([
    sb.from("medications").select("name, kind, regular, as_needed, times").eq("active", true),
    sb.from("injuries").select("spot, kind, started_on").is("ended_on", null),
    sb.from("planned_sessions").select("day, sport, time, status").gte("day", day).lte("day", isoDay(daysAgo(-6))).order("day"),
    sb.from("kb_sets").select("day, exercise, reps, weight_kg").gte("day", isoDay(daysAgo(20))).order("day"),
    sb.from("climbs").select("grade, result").gte("day", isoDay(daysAgo(55))),
    sb.from("settings").select("data").maybeSingle(),
  ]);
  const m = (meds.data ?? []) as Pick<Medication, "name" | "kind" | "regular" | "as_needed" | "times">[];
  if (m.length) lines.push("Aktive Mittel: " + m.map((x) => `${x.name} (${x.kind}${x.regular ? ", regelmäßig " + x.times.join("/") : ""}${x.as_needed ? ", bei Bedarf" : ""})`).join(", ") + ".");
  const hubs7 = data.hubs.filter((h) => h.day >= isoDay(daysAgo(6))).length;
  if (m.some((x) => x.as_needed)) lines.push(`Bedarfs-Einnahmen letzte 7 Tage: ${hubs7}.`);
  if (data.illness) lines.push(`Aktuelle Krankheit: ${data.illness.label}, Stärke ${data.illness.severity}${data.illness.fever ? ", Fieber" : ""}${data.illness.below_neck ? ", Beschwerden unterhalb des Halses" : ""}, seit ${data.illness.started_on}.`);
  for (const i of (inj.data ?? []) as Pick<Injury, "spot" | "kind" | "started_on">[]) lines.push(`Verletzung: ${SPOTS[i.spot]?.label ?? i.spot}${i.kind ? " (" + i.kind + ")" : ""} seit ${i.started_on}.`);
  const p = (plan.data ?? []) as Pick<Session, "day" | "sport" | "time" | "status">[];
  if (p.length) lines.push("Plan nächste 7 Tage: " + p.filter((x) => x.status !== "ausgelassen").map((x) => `${x.day.slice(5)} ${SPORTS[x.sport].label}${x.status === "erledigt" ? " (erledigt)" : ""}`).join(", ") + ".");
  const sets = (kb.data ?? []) as { day: string; exercise: string; reps: number; weight_kg: number }[];
  if (sets.length) {
    const byEx = new Map<string, { reps: number; kg: number }>();
    for (const s of sets) byEx.set(s.exercise, { reps: s.reps, kg: s.weight_kg });
    lines.push("Kettlebell zuletzt: " + [...byEx.entries()].map(([e, v]) => `${e} ${v.reps}× ${v.kg ? v.kg + " kg" : "Körpergewicht"}`).join(", ") + ".");
  }
  const cl = (climbs.data ?? []) as { grade: string; result: string }[];
  if (cl.length) {
    const tops = cl.filter((c) => c.result !== "versuch");
    lines.push(`Bouldern letzte 8 Wochen: ${tops.length} Tops von ${cl.length} Versuchen, höchster Top ${tops.map((c) => c.grade).sort().pop() ?? "–"}.`);
  }
  const exam = (settings.data as { data?: { examDate?: string } } | null)?.data?.examDate;
  lines.push(`Prüfung 5. Kyu: ${exam ?? "Frühjahr 2027, Datum noch offen"}.`);

  for (const pat of patterns(data).filter((x) => x.ready)) lines.push(`Muster „${pat.title}“: ${pat.text}`);
  return lines.join("\n");
}
