// Puls in Sekunden und Garmins Satzerkennung je Aktivität (Abschnitte aus dem Puls, freigegeben 25.11.).
// Gespeichert wird der Puls im Schnitt je 5 Sekunden ab Beginn der Einheit (hr_fine)
// und die aktiven Sätze aus der Satzerkennung (garmin_sets). Die Erkennung selbst rechnet die App.

// deno-lint-ignore no-explicit-any
type Any = any;

export const FINE_STEP = 5; // Sekunden je Wert in hr_fine
const MAX_S = 6 * 3600; // längere Einheiten werden abgeschnitten

const DETAIL_PATHS = [
  (id: number) => `/activity-service/activity/${id}/details?maxChartSize=20000&maxPolylineSize=0&maxHeatMapSize=0`,
  (id: number) => `/activity-service/activity/${id}/details`,
];
const SET_PATH = (id: number) => `/activity-service/activity/${id}/exerciseSets`;

// Sportarten mit Satzerkennung bei Garmin (Krafttraining) oder eigener Zuordnung „Kettlebell“
export function wantsSets(typeKey: string | null, override: string | null): boolean {
  return override === "kettlebell" || /strength|hiit|cardio|fitness_equipment/.test(typeKey ?? "");
}

// Aus der Antwort von /details den Puls je 5 Sekunden bilden
export function fineSeries(d: Any): (number | null)[] {
  const desc = (d?.metricDescriptors ?? []) as Any[];
  const idx = (key: string) => desc.find((m) => m?.key === key)?.metricsIndex as number | undefined;
  const iHr = idx("directHeartRate");
  if (iHr === undefined) return [];
  const iTs = idx("directTimestamp");
  const iDur = idx("sumElapsedDuration") ?? idx("sumDuration");
  const rows = (d?.activityDetailMetrics ?? []) as Any[];
  let t0: number | null = null;
  const bins: { sum: number; n: number }[] = [];
  rows.forEach((r, k) => {
    const m = r?.metrics as Any[];
    if (!Array.isArray(m)) return;
    if (t0 === null && iTs !== undefined && typeof m[iTs] === "number") t0 = m[iTs];
    const hr = m[iHr];
    if (typeof hr !== "number" || hr < 30 || hr > 240) return;
    let sec: number;
    if (iTs !== undefined && typeof m[iTs] === "number") {
      sec = (m[iTs] - (t0 as number)) / 1000;
    } else if (iDur !== undefined && typeof m[iDur] === "number") {
      sec = m[iDur];
    } else {
      sec = k;
    }
    if (!(sec >= 0) || sec >= MAX_S) return;
    const b = Math.floor(sec / FINE_STEP);
    const cur = bins[b] ?? { sum: 0, n: 0 };
    cur.sum += hr;
    cur.n++;
    bins[b] = cur;
  });
  const out: (number | null)[] = [];
  for (let i = 0; i < bins.length; i++) out.push(bins[i]?.n ? Math.round(bins[i].sum / bins[i].n) : null);
  return out;
}

// Aktive Sätze aus /exerciseSets, Beginn in Sekunden ab Start der Aktivität
export function activeSets(d: Any, startGmtMs: number | null): { s: number | null; d: number | null; r: number | null }[] {
  const list = (d?.exerciseSets ?? []) as Any[];
  return list
    .filter((x) => x?.setType === "ACTIVE")
    .map((x) => {
      const t = typeof x?.startTime === "string" ? Date.parse(x.startTime.replace(" ", "T").replace(/Z?$/, "Z")) : NaN;
      const s = startGmtMs !== null && Number.isFinite(t) ? Math.round((t - startGmtMs) / 1000) : null;
      const dur = typeof x?.duration === "number" ? Math.round(x.duration) : null;
      const r = typeof x?.repetitionCount === "number" ? x.repetitionCount : null;
      return { s, d: dur, r };
    });
}

type Get = (path: string) => Promise<Any>;
export type DetailState = { path: number | null; failed: boolean; setsFailed: boolean };

// Eine Aktivität: Puls in Sekunden und, wenn sinnvoll, Sätze. Fehler beim ersten Versuch merken,
// damit ein nicht abrufbarer Pfad nicht bei jeder Aktivität erneut versucht wird.
export async function fetchDetail(
  get: Get,
  id: number,
  sets: boolean,
  startGmtMs: number | null,
  st: DetailState,
): Promise<{ hr_fine: (number | null)[]; garmin_sets?: { s: number | null; d: number | null; r: number | null }[] } | null> {
  if (st.failed) return null;
  let detail: Any = undefined;
  const order = st.path !== null ? [st.path] : DETAIL_PATHS.map((_, i) => i);
  for (const i of order) {
    try {
      detail = await get(DETAIL_PATHS[i](id));
      st.path = i;
      break;
    } catch {
      // nächsten Pfad versuchen
    }
  }
  if (detail === undefined) {
    if (st.path === null) st.failed = true;
    return null;
  }
  const out: { hr_fine: (number | null)[]; garmin_sets?: { s: number | null; d: number | null; r: number | null }[] } = { hr_fine: fineSeries(detail) };
  if (sets && !st.setsFailed) {
    try {
      out.garmin_sets = activeSets(await get(SET_PATH(id)), startGmtMs);
    } catch {
      st.setsFailed = true;
    }
  }
  return out;
}
