// Texte für den Tagesstart und die Mitteilung nach dem Training (freigegeben 25.11.).
// Gerechnet wird ohne KI: Readiness wie auf der Uhr (watch/today.ts), Abschnitte wie in der App (_shared/abschnitte.ts).

import { today } from "../watch/today.ts";
import { loadToPct } from "../watch/target.ts";
import { countWord, detect, learnScale, SEGMENT_RULES, type Example } from "../_shared/abschnitte.ts";

// deno-lint-ignore no-explicit-any
type Any = any;
type Msg = { title: string; body: string; url: string };

const PHASE: Record<string, string> = { MENS: "Menstruation", FOLL: "Follikelphase", EISP: "um den Eisprung", LUT1: "Lutealphase", LUT2: "späte Lutealphase" };
const SPORT_NAME: Record<string, string> = { karate: "Karate", kettlebell: "Kettlebell", klettern: "Bouldern", ausdauer: "Ausdauer", sonstiges: "Training" };
const PLAN_NAME: Record<string, string> = { KARATE: "Karate", KETTLEBELL: "Kettlebell", BOULDERN: "Bouldern", AUSDAUER: "Ausdauer", TRAINING: "Training" };

// ---------- Tagesstart ----------

function factorText(k: string, e: number, t: Any): string | null {
  switch (k) {
    case "SCHLAF":
      return t.sleep !== null ? `Schlaf ${t.sleep}` : null;
    case "HRV":
      return e < 0 ? "HRV unter deinem Bereich" : "HRV über deinem Bereich";
    case "PULS":
      return e < 0 ? "Ruhepuls erhöht" : "Ruhepuls niedrig";
    case "BB":
      return t.bb !== null ? `Energie ${t.bb}` : null;
    case "CHECK-IN":
      return e < 0 ? "Check-in eher müde" : "Check-in gut";
    case "SYMPTOME":
      return "Symptome";
    case "ZYKLUS":
      return "vor der Periode";
    case "KRANK":
      return "krank";
    case "LAST":
      return "Belastung gestern hoch";
    case "STRESS":
      return "Stress der letzten Tage erhöht";
    case "INFEKT":
      return "Ruhepuls deutlich erhöht";
    default:
      return null;
  }
}

export async function tagesstart(sb: Any, uid: string, day: string): Promise<{ ready: boolean; full: Msg; quiet: Msg }> {
  const t = await today(sb, uid, day);
  const ready = t.hrv !== null || t.sleep !== null || t.rhr !== null;
  const reasons = ((t.factors ?? []) as { k: string; e: number }[])
    .slice()
    .sort((a, b) => Math.abs(b.e) - Math.abs(a.e))
    .map((f) => factorText(f.k, f.e, t))
    .filter((x): x is string => !!x)
    .slice(0, 2);
  const line1 = [reasons.length ? reasons.join(", ") : "Alles im üblichen Bereich", t.phase ? PHASE[t.phase] : null].filter(Boolean).join(" · ");
  const open = ((t.plan ?? []) as Any[]).filter((p) => !p.done).map((p) => PLAN_NAME[p.label] ?? "Training");
  const line2 = t.pause ? "Heute Pause, gute Besserung" : open.length ? `Heute: ${[...new Set(open)].join(", ")} · Belastung ${t.band[0]}–${t.band[1]} %` : `Belastung heute ${t.band[0]}–${t.band[1]} %`;
  const lines = [line1, line2, t.checkinDone ? null : "Check-in offen"].filter(Boolean);
  return {
    ready,
    full: { title: t.pause ? "Tagesstart · Pause" : `Tagesstart · Readiness ${t.goal === null ? "–" : (t.goal / 10).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, body: lines.join("\n"), url: "/" },
    quiet: { title: "Tagesstart", body: t.checkinDone ? "Deine Readiness für heute ist da." : "Deine Readiness für heute ist da. Check-in offen.", url: "/" },
  };
}

// ---------- Tagesabschluss ----------

const HARD_PCT = Math.round(loadToPct(105)); // wie HARD_DAY_PCT in lib/insights.ts
const MID_PCT = Math.round(loadToPct(60)); // wie MID_DAY_PCT
const median = (a: number[]) => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
};
const clock = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const hm = (hours: number) => {
  const t = Math.round(hours * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} Std`;
};
const niceLabel = (s: string) => (s === "SUPPLEMENTS" ? "Supplements" : s.charAt(0) + s.slice(1).toLowerCase());

// Schlafbedarf für die kommende Nacht wie sleepNeed in lib/today.ts (Grundbedarf als Median der letzten
// 30 Nächte ab 14 Nächten, sonst 7,5 Std; ein Siebtel der Schlafschuld der letzten 7 Nächte, höchstens 60 Min;
// 20 Min nach hartem, 10 Min nach mittlerem Tag). Ins Bett bis: übliche Aufwachzeit der letzten 14 Nächte minus Bedarf.
export function sleepPlan(day: string, rows: { day: string; sleep_seconds?: number | null; sleep_end_min?: number | null }[], loadPct: number): { hours: number; bed: string | null } {
  const back = (n: number) => new Date(Date.parse(day + "T12:00:00Z") - n * 864e5).toISOString().slice(0, 10);
  const nights = rows.filter((r) => r.day > back(30) && r.day <= day && typeof r.sleep_seconds === "number" && r.sleep_seconds > 0);
  const hrs = nights.map((r) => (r.sleep_seconds as number) / 3600);
  const base = hrs.length >= 14 ? (median(hrs) as number) : 7.5;
  let debt = 0;
  for (const r of nights.filter((r) => r.day > back(7))) debt += Math.max(0, base - (r.sleep_seconds as number) / 3600);
  const add = Math.min(60, Math.round((debt * 60) / 7)) + (loadPct >= HARD_PCT ? 20 : loadPct >= MID_PCT ? 10 : 0);
  const hours = base + add / 60;
  const wake = median(rows.filter((r) => r.day > back(14) && typeof r.sleep_end_min === "number").map((r) => r.sleep_end_min as number));
  return { hours, bed: wake === null ? null : clock(wake + 24 * 60 - hours * 60) };
}

export async function tagesabschluss(sb: Any, uid: string, day: string): Promise<{ full: Msg; quiet: Msg }> {
  const t = await today(sb, uid, day);
  const back = new Date(Date.parse(day + "T12:00:00Z") - 31 * 864e5).toISOString().slice(0, 10);
  const { data } = await sb.from("garmin_daily").select("day, sleep_seconds, sleep_end_min").eq("user_id", uid).gte("day", back);
  const plan = sleepPlan(day, (data ?? []) as Any[], t.load ?? 0);
  const [lo, hi] = t.band as [number, number];
  const load = Math.round(t.load ?? 0);
  const verdict = t.pause ? "heute Pause" : load < lo ? `Ziel ${lo}–${hi} %, noch Luft` : load > hi ? `über dem Ziel ${lo}–${hi} %` : `im Ziel ${lo}–${hi} %`;
  const open = ((t.slots ?? []) as Any[]).filter((x) => !x.done).map((x) => niceLabel(String(x.label)));
  const lines = [
    verdict.charAt(0).toUpperCase() + verdict.slice(1),
    `Schlafbedarf ${hm(plan.hours)}${plan.bed ? ` · ins Bett bis ${plan.bed}` : ""}`,
    open.length ? `Offen: ${[...new Set(open)].join(", ")}` : null,
  ].filter(Boolean);
  const url = "/tagebuch?abschluss=1";
  return {
    full: { title: `Tagesabschluss · Belastung ${load} %`, body: lines.join("\n"), url },
    quiet: { title: "Tagesabschluss", body: "Dein Tag ist bereit für den Abschluss.", url },
  };
}

// ---------- Nach dem Training ----------

// Sportart wie sportOf in lib/training.ts: eigene Zuordnung vor der Garmin-Sportart
function sportOf(a: { type_key: string | null; sport_override?: string | null }): string {
  const o = a.sport_override;
  if (o && o in SPORT_NAME) return o;
  const k = a.type_key ?? "";
  if (/martial|boxing|karate|kickbox/.test(k)) return "karate";
  if (/boulder|climb/.test(k)) return "klettern";
  if (/strength|hiit|kettlebell/.test(k)) return "kettlebell";
  if (/run|walk|hik|cycl|bik|swim|row|elliptical/.test(k)) return "ausdauer";
  return "sonstiges";
}

// Garmin-Ortszeit „JJJJ-MM-TT HH:MM:SS“ als Millisekunden „wie UTC“, damit sich Ortszeiten vergleichen lassen
const localMs = (s: string) => Date.parse(s.replace(" ", "T").slice(0, 19) + "Z");
function berlinNowMs(): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
}

const durText = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.round((s % 3600) / 60)).padStart(2, "0")} Std` : `${Math.max(1, Math.round(s / 60))} Min`);

function pulseOf(daily: Any[], day: string, maxHr: number | null): { rest: number; max: number } {
  const d = daily.find((r) => r.day === day);
  const ld = d?.load_daily_min;
  const rest = typeof ld?.puls_ruhe === "number" ? ld.puls_ruhe : typeof d?.resting_hr === "number" ? d.resting_hr : 60;
  const max = typeof ld?.puls_max === "number" ? ld.puls_max : Math.max(170, maxHr ?? 0);
  return { rest, max };
}

export async function trainingMessages(sb: Any): Promise<{ user_id: string; full: Msg; quiet: Msg }[]> {
  const { data, error } = await sb
    .from("garmin_activities")
    .select("user_id, activity_id, type_key, sport_override, sport_label, name, start_local, duration_s, avg_hr, max_hr, training_load, hr_fine, garmin_sets")
    .is("notified_at", null)
    .order("start_local", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  const now = berlinNowMs();
  const out: { user_id: string; full: Msg; quiet: Msg }[] = [];
  for (const a of (data ?? []) as Any[]) {
    // Gleich als gemeldet markieren, damit kein zweiter Lauf dieselbe Einheit meldet
    await sb.from("garmin_activities").update({ notified_at: new Date().toISOString() }).eq("user_id", a.user_id).eq("activity_id", a.activity_id);
    if (a.sport_override === "ignorieren" || !a.start_local) continue;
    const end = localMs(a.start_local) + (a.duration_s ?? 0) * 1000;
    if (!Number.isFinite(end) || now - end > 6 * 3600e3) continue;
    const sport = sportOf(a);
    const day = String(a.start_local).slice(0, 10);
    const label = sport === "sonstiges" ? (a.sport_label || a.name || "Training") : SPORT_NAME[sport];
    const parts: string[] = [];

    const rule = SEGMENT_RULES[sport as keyof typeof SEGMENT_RULES];
    if (rule) {
      let n: number | null = null;
      if (sport === "kettlebell") {
        const { count } = await sb.from("kb_sets").select("set_no", { count: "exact", head: true }).eq("user_id", a.user_id).eq("day", day);
        if (count) n = count;
        else if (Array.isArray(a.garmin_sets) && a.garmin_sets.length) n = a.garmin_sets.length;
      }
      if (n === null && Array.isArray(a.hr_fine) && a.hr_fine.length) {
        const [{ data: daily }, { data: conf }] = await Promise.all([
          sb.from("garmin_daily").select("day, resting_hr, load_daily_min").eq("user_id", a.user_id).gte("day", String(new Date(localMs(day + " 00:00:00") - 180 * 864e5).toISOString()).slice(0, 10)),
          sb.from("garmin_activities").select("type_key, sport_override, start_local, max_hr, hr_fine, segment_count").eq("user_id", a.user_id).not("segment_count", "is", null).order("start_local", { ascending: false }).limit(60),
        ]);
        const days = (daily ?? []) as Any[];
        const examples: Example[] = ((conf ?? []) as Any[])
          .filter((r) => sportOf(r) === sport && Array.isArray(r.hr_fine) && r.hr_fine.length)
          .slice(0, 20)
          .map((r) => ({ hr: r.hr_fine, ...pulseOf(days, String(r.start_local).slice(0, 10), r.max_hr), count: r.segment_count }));
        const { rest, max } = pulseOf(days, day, a.max_hr);
        const d = detect(a.hr_fine, rule, rest, max, learnScale(rule, examples));
        if (d) n = d.segments.length;
      }
      if (n) parts.push(countWord(rule, n));
    }
    if (typeof a.training_load === "number" && a.training_load > 0) parts.push(`Belastung ${Math.round(loadToPct(a.training_load))} %`);
    if (a.avg_hr) parts.push(`Puls Ø ${a.avg_hr}`);

    const url = `/training/einheit/${a.activity_id}`;
    out.push({
      user_id: a.user_id,
      full: { title: `${label} · ${durText(a.duration_s ?? 0)}`, body: [parts.join(" · "), "Wie anstrengend war's?"].filter(Boolean).join("\n"), url },
      quiet: { title: "Training ausgewertet", body: "Tippen für die Zusammenfassung.", url },
    });
  }
  return out;
}
