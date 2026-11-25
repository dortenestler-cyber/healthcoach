// Abschnitte aus dem Puls (freigegeben 25.11.): Versuche beim Bouldern, Sätze bei Kettlebell,
// Runden beim Karate, Intervalle bei Ausdauer. Grundlage ist der Puls je 5 Sekunden (hr_fine).
// Eine Spitze zählt, wenn der Puls deutlich über die Täler links und rechts steigt (Prominenz,
// gemessen als Anteil der Pulsreserve) und mindestens die Mindestpause von der nächsten entfernt liegt.
// Bestätigte Zahlen aus früheren Einheiten stimmen die Schwelle je Sportart nach.

// Gemeinsam für App (lib/abschnitte.ts) und Funktion push: keine Importe, damit beide Seiten sie laden können.
type Sport = "karate" | "kettlebell" | "klettern" | "ausdauer" | "sonstiges";

export const FINE_STEP = 5; // Sekunden je Wert, wie in garmin-sync/details.ts

export type SegmentRule = { one: string; many: string; prom: number; gapS: number; minS: number; maxS: number };

export const SEGMENT_RULES: Partial<Record<Sport, SegmentRule>> = {
  klettern: { one: "Versuch", many: "Versuche", prom: 0.12, gapS: 60, minS: 20, maxS: 300 },
  kettlebell: { one: "Satz", many: "Sätze", prom: 0.1, gapS: 30, minS: 20, maxS: 180 },
  karate: { one: "Runde", many: "Runden", prom: 0.12, gapS: 30, minS: 45, maxS: 240 },
  ausdauer: { one: "Intervall", many: "Intervalle", prom: 0.18, gapS: 60, minS: 30, maxS: 900 },
};

export const countWord = (r: SegmentRule, n: number) => `${n} ${n === 1 ? r.one : r.many}`;

export type Segment = {
  start: number; // Sekunden ab Beginn: Tal vor dem Anstieg
  peak: number; // Sekunden ab Beginn: Spitze
  end: number; // Sekunden ab Beginn: Tal danach
  peakHr: number;
  drop60: number | null; // Abfall des Pulses in der ersten Minute nach der Spitze, bpm
};

export type Detection = { segments: Segment[]; smooth: (number | null)[]; workS: number | null; restS: number | null; drop60: number | null };

// Lücken bis 30 Sekunden schließen, dann über 15 Sekunden glätten
function prepare(raw: (number | null)[]): (number | null)[] {
  const v = raw.map((x) => (typeof x === "number" && x > 30 ? x : null));
  const filled = [...v];
  let last = -1;
  for (let i = 0; i < v.length; i++) {
    if (v[i] === null) continue;
    if (last >= 0 && i - last > 1 && i - last <= 6) {
      for (let k = last + 1; k < i; k++) filled[k] = (v[last] as number) + (((v[i] as number) - (v[last] as number)) * (k - last)) / (i - last);
    }
    last = i;
  }
  return filled.map((x, i) => {
    if (x === null) return null;
    let sum = 0;
    let n = 0;
    for (let k = i - 1; k <= i + 1; k++) {
      const y = filled[k];
      if (typeof y === "number") {
        sum += y;
        n++;
      }
    }
    return sum / n;
  });
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function detect(raw: (number | null)[] | null | undefined, rule: SegmentRule, rest: number, max: number, scale = 1): Detection | null {
  if (!Array.isArray(raw) || raw.filter((x) => typeof x === "number").length < 24) return null;
  const s = prepare(raw);
  const span = Math.max(20, max - rest);
  const minProm = rule.prom * scale * span;
  const gap = Math.max(1, Math.round(rule.gapS / FINE_STEP));
  const n = s.length;
  const val = (i: number) => s[i] ?? -Infinity;

  // Kandidaten: lokale Maxima im Fenster ±2 Werte
  const cands: { i: number; prom: number; l: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = s[i];
    if (x === null) continue;
    let top = true;
    for (let k = i - 2; k <= i + 2 && top; k++) if (k !== i && k >= 0 && k < n && val(k) > x) top = false;
    if (!top || (i > 0 && val(i - 1) === x)) continue;
    // Prominenz: tiefstes Tal bis zum nächsten höheren Punkt auf jeder Seite
    let lMin = x;
    let lAt = i;
    for (let k = i - 1; k >= 0 && val(k) <= x; k--) {
      if (s[k] !== null && (s[k] as number) < lMin) {
        lMin = s[k] as number;
        lAt = k;
      }
    }
    let rMin = x;
    let rAt = i;
    for (let k = i + 1; k < n && val(k) <= x; k++) {
      if (s[k] !== null && (s[k] as number) < rMin) {
        rMin = s[k] as number;
        rAt = k;
      }
    }
    const prom = x - Math.max(lMin, rMin);
    if (prom >= minProm) cands.push({ i, prom, l: lAt, r: rAt });
  }

  // Mindestabstand: höchste Spitzen zuerst behalten
  const kept: typeof cands = [];
  for (const c of [...cands].sort((a, b) => val(b.i) - val(a.i))) {
    if (kept.every((k) => Math.abs(k.i - c.i) >= gap)) kept.push(c);
  }
  kept.sort((a, b) => a.i - b.i);

  const segments: Segment[] = [];
  kept.forEach((c, j) => {
    // Tal davor: tiefster Punkt seit der vorigen Spitze (höchstens bis zu deren Prominenz-Tal)
    const from = j > 0 ? kept[j - 1].i : c.l;
    let st = c.i;
    for (let k = c.i - 1; k >= from; k--) if (s[k] !== null && (s[k] as number) <= val(st)) st = k;
    const to = j < kept.length - 1 ? kept[j + 1].i : c.r;
    let en = c.i;
    for (let k = c.i + 1; k <= to; k++) if (s[k] !== null && (s[k] as number) <= val(en)) en = k;
    const dur = (c.i - st) * FINE_STEP;
    if (dur < rule.minS * 0.5 || dur > rule.maxS * 1.5) return;
    const after = s[c.i + 12];
    segments.push({
      start: st * FINE_STEP,
      peak: c.i * FINE_STEP,
      end: en * FINE_STEP,
      peakHr: Math.round(val(c.i)),
      drop60: typeof after === "number" ? Math.round(val(c.i) - after) : null,
    });
  });

  const work = segments.map((g) => g.peak - g.start);
  const rests = segments.slice(1).map((g, k) => g.start - segments[k].peak);
  const drops = segments.map((g) => g.drop60).filter((d): d is number => d !== null);
  const r1 = (v: number | null) => (v === null ? null : Math.round(v));
  return { segments, smooth: s, workS: r1(mean(work)), restS: r1(mean(rests)), drop60: r1(mean(drops)) };
}

export type Example = { hr: (number | null)[]; rest: number; max: number; count: number };

// Schwelle je Sportart aus bestätigten Einheiten: der Faktor, mit dem die Erkennung
// die bestätigten Zahlen am besten trifft. Ab zwei Beispielen, sonst 1.
export function learnScale(rule: SegmentRule, examples: Example[]): number {
  if (examples.length < 2) return 1;
  let best = 1;
  let bestErr = Infinity;
  for (let k = 6; k <= 20; k++) {
    const sc = k / 10;
    let err = 0;
    for (const e of examples) {
      const d = detect(e.hr, rule, e.rest, e.max, sc);
      err += Math.abs((d?.segments.length ?? 0) - e.count);
    }
    if (err < bestErr - 1e-9 || (Math.abs(err - bestErr) < 1e-9 && Math.abs(sc - 1) < Math.abs(best - 1))) {
      best = sc;
      bestErr = err;
    }
  }
  return best;
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// Ergebnissatz für die Karte
export function segmentSentence(rule: SegmentRule, n: number, d: Detection | null): string {
  if (!n) return `Keine ${rule.many} im Puls erkennbar.`;
  const parts = [countWord(rule, n)];
  if (d?.workS) parts.push(`im Schnitt ${mmss(d.workS)} Min Belastung`);
  if (d?.restS) parts.push(`${mmss(d.restS)} Min Pause`);
  return parts.join(", ") + ".";
}
