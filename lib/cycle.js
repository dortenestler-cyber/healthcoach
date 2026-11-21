// Zykluslogik: Phase, nächste Periode als Fenster, Regelreihenfolge und Readiness.
// Reine Berechnungen ohne Netzwerk. Alle Phasen sind geschätzt und werden so benannt.
// Die Werte sind Startwerte zum Kalibrieren, nicht medizinisch geprüft. Die App schlägt vor, sie entscheidet nicht.
import { computeTarget, cycleInfo, periodStarts } from "@/lib/insights";
// ---------- Hilfen
const DAY_MS = 864e5;
const addDays = (iso, n) => {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / DAY_MS);
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const sd = (v) => {
    const m = mean(v);
    return m === null || v.length < 2 ? null : Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};
export const PHASES = {
    menstruation: {
        label: "Menstruation",
        pattern: "Müdigkeit und Krämpfe sind möglich, die Körperwerte liegen meist im Normalbereich.",
        suggestion: "Mobility, Spaziergang, lockere Ausdauer, Kraft nach Gefühl",
        rpe: "5–7",
        hint: "Ungewohnt starke oder lange Blutung bitte ärztlich abklären lassen.",
    },
    follikel: {
        label: "Follikelphase",
        pattern: "Oft gute Erholung, die HRV ist eher höher.",
        suggestion: "Aufbau, Kraft mit mehr Volumen, Intervalle",
        rpe: "8–9",
        hint: "10 Minuten Aufwärmen für Sehnen und Gelenke.",
    },
    eisprung: {
        label: "Eisprung-Fenster",
        pattern: "Hohe Leistung ist möglich, Sehnen und Gelenke sind etwas lockerer.",
        suggestion: "Schwere Sätze oder Bestleistung nur bei guter Readiness",
        rpe: "bis 9,5",
        hint: "Gründlich aufwärmen, Technik vor Gewicht, Sprünge dosieren.",
    },
    "luteal-frueh": {
        label: "Frühe Lutealphase",
        pattern: "Temperatur und Ruhepuls leicht höher, die HRV sinkt etwas.",
        suggestion: "Kraft, ruhige Ausdauer",
        rpe: "8–8,5",
        hint: "Etwas niedrigere HRV ist in dieser Phase normal.",
    },
    "luteal-spaet": {
        label: "Späte Lutealphase",
        pattern: "Schlaf oft unruhiger, HRV niedriger, Nachtschweiß häufiger.",
        suggestion: "Kraft moderater, Technik, Mobility",
        rpe: "7–7,5",
        hint: "Mehr Erholung einplanen.",
    },
};
// Grenzen passen sich der eigenen Zykluslänge an:
// Tag 1–5 Menstruation, Eisprung etwa 14 Tage vor der nächsten Periode (3-Tage-Fenster),
// letzte 7 Tage späte Lutealphase. Länger als üblich: weiter späte Lutealphase.
export function phaseFor(cycleDay, length) {
    const ov = length - 14;
    if (cycleDay <= 5)
        return "menstruation";
    if (cycleDay > length - 7)
        return "luteal-spaet";
    if (cycleDay < ov - 1)
        return "follikel";
    if (cycleDay <= ov + 1)
        return "eisprung";
    return "luteal-frueh";
}
// Beobachtete Zykluslängen (nur plausible Werte 15–60 Tage), die letzten 6
export function cycleLengths(diary, until) {
    const starts = periodStarts(diary).filter((s) => !until || s <= until);
    const lens = [];
    for (let i = 1; i < starts.length; i++) {
        const l = daysBetween(starts[i - 1], starts[i]);
        if (l >= 15 && l <= 60)
            lens.push(l);
    }
    return lens.slice(-6);
}
// Nächste Periode immer als Fenster, nie als einzelnes Datum. Ab zwei beobachteten Zyklen.
export function nextPeriodWindow(diary, day) {
    const starts = periodStarts(diary).filter((s) => s <= day);
    const last = starts[starts.length - 1];
    const lens = cycleLengths(diary, day);
    if (!last || lens.length < 2)
        return null;
    return { earliest: addDays(last, Math.min(...lens)), latest: addDays(last, Math.max(...lens)), basis: lens.length };
}
export function cycleToday(day, diary) {
    const ci = cycleInfo(day, diary);
    return {
        cycleDay: ci.cycleDay,
        length: ci.length,
        phase: ci.cycleDay !== null ? phaseFor(ci.cycleDay, ci.length) : null,
        window: nextPeriodWindow(diary, day),
        cycles: ci.cycles,
    };
}
export const STAGES = { erholen: "Erholen", behutsam: "Behutsam", bereit: "Bereit", "volle-kraft": "Volle Kraft" };
// Schwellen sind eine Annahme und werden mit echten Daten geprüft
export function readinessFrom(t) {
    const value = t.pause ? 0 : Math.round(t.score) / 10;
    const stage = value < 3 ? "erholen" : value < 6 ? "behutsam" : value < 8.5 ? "bereit" : "volle-kraft";
    return { value, stage, label: STAGES[stage] };
}
// 1. Warnzeichen aus dem Tagebuch
function redFlagFor(day, diary) {
    const byDay = new Map(diary.map((d) => [d.day, d]));
    // starke Blutung (Stufe 4) an 3 Tagen in Folge
    let strongRun = 0;
    for (let i = 0; i < 3; i++)
        if ((byDay.get(addDays(day, -i))?.bleeding ?? 0) >= 4)
            strongRun++;
    if (strongRun >= 3)
        return "Seit drei Tagen starke Blutung. Bitte ärztlich abklären lassen.";
    // Blutung länger als 8 Tage am Stück
    let run = 0;
    while (run < 30 && (byDay.get(addDays(day, -run))?.bleeding ?? 0) >= 1)
        run++;
    if (run > 8)
        return `Blutung seit ${run} Tagen. Bitte ärztlich abklären lassen.`;
    return null;
}
// 2. Infekt-Verdacht: Ruhepuls mindestens 6 bpm über dem Schnitt und HRV darunter
function infectionFor(day, data) {
    const today = data.daily.find((r) => r.day === day);
    if (!today || today.resting_hr === null || today.hrv_last_night === null)
        return false;
    const hist = data.daily.filter((r) => r.day < day && r.day >= addDays(day, -30));
    const rhr = mean(hist.map((r) => r.resting_hr).filter((v) => v !== null));
    const hrv = mean(hist.map((r) => r.hrv_last_night).filter((v) => v !== null));
    if (rhr === null || hrv === null || hist.length < 7)
        return false;
    return today.resting_hr >= rhr + 6 && today.hrv_last_night < hrv;
}
// 4. Symptome plus niedrige HRV (beides muss zusammenkommen)
function throttleFor(day, data) {
    const di = data.diary.find((d) => d.day === day) ?? data.diary.find((d) => d.day === addDays(day, -1));
    const s = di?.symptoms ?? {};
    const symptoms = (s.nacht ?? 0) >= 2 || (s.schlaf ?? 0) >= 2 || Object.values(s).some((v) => v >= 3);
    if (!symptoms)
        return false;
    const today = data.daily.find((r) => r.day === day);
    const hist = data.daily
        .filter((r) => r.day < day && r.day >= addDays(day, -30))
        .map((r) => r.hrv_last_night)
        .filter((v) => v !== null);
    const m = mean(hist);
    const d = sd(hist);
    if (!today || today.hrv_last_night === null || m === null || d === null || hist.length < 7)
        return false;
    return today.hrv_last_night < m - 0.75 * d;
}
export function dayRule(day, data, injuredSports = []) {
    const target = computeTarget(day, data);
    const cycle = cycleToday(day, data.diary);
    const readiness = readinessFrom(target);
    const redFlag = redFlagFor(day, data.diary);
    const infection = !redFlag && infectionFor(day, data);
    const rehaSports = [...new Set(injuredSports)];
    const throttle = throttleFor(day, data);
    const corridorFactor = throttle ? 0.78 : 1;
    const base = { redFlag, infection, rehaSports, throttle, corridorFactor, cycle, readiness, target };
    if (redFlag)
        return { ...base, level: "warnzeichen", title: "Bitte ärztlich abklären", text: redFlag, infection: false, throttle: false, corridorFactor: 1 };
    if (infection)
        return {
            ...base,
            level: "infekt",
            title: "Schongang empfohlen",
            text: "Dein Ruhepuls ist deutlich höher und deine HRV niedriger als sonst. Das kann auf einen Infekt hindeuten. Vorschlag: heute Pause oder nur ruhig gehen. Du entscheidest.",
        };
    if (rehaSports.length)
        return {
            ...base,
            level: "reha",
            title: "Reha berücksichtigt",
            text: `Für ${rehaSports.join(", ")} schlägt die App Ersatzübungen vor.${throttle ? " Dazu etwas weniger Belastung, weil Symptome und niedrige HRV zusammenkommen." : ""}`,
        };
    if (throttle)
        return {
            ...base,
            level: "drosseln",
            title: "Heute etwas weniger",
            text: "Symptome und eine niedrige HRV kommen zusammen. Vorschlag: etwa ein Fünftel weniger Belastung, Fokus auf Technik und Mobility.",
        };
    const p = cycle.phase ? PHASES[cycle.phase] : null;
    return {
        ...base,
        level: "phase",
        title: p ? `${p.label} (geschätzt)` : "Zyklusphase noch unbekannt",
        text: p ? `Vorschlag: ${p.suggestion}. ${p.hint}` : "Trag deine Periode im Tagebuch ein, dann kann die App die Phase schätzen.",
    };
}
