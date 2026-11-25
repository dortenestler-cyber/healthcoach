"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate } from "@/lib/dates";
import { SPOTS, weekStart, type Injury } from "@/lib/health";
import { fromIso, loadSettings, saveSettings, sportOf, type Settings } from "@/lib/training";
import { GRUPPEN, HINWEISE, KUERZEL, NEXT, QUELLE, STATUS_WORT, grad, satz, stand, type Punkt, type Status } from "@/lib/karate/programm";

type Item = { id: string; label: string; category: string; status: Status; kyu: number };
const CATEGORIES = ["Kihon", "Kata", "Anwendung", "Kumite", "Begriffe", "Sonstiges"];
const KYUS = [5, 4, 3, 2, 1];
type Pruefung = { datum?: string; bestanden?: string };
type KarateSettings = { ziel?: number; pruefungen?: Record<string, Pruefung> };
const MARK: Record<Status, string> = { offen: "", uebe: "◐", sitzt: "✓" };

// Aktuelle Prüfung aus den Einstellungen; das alte examDate gilt für den 5. Kyu
export function karateZiel(s: Settings): { ziel: number; pruefungen: Record<string, Pruefung> } {
  const k = (s.karate ?? {}) as KarateSettings;
  const pruefungen = { ...(k.pruefungen ?? {}) };
  if (s.examDate && !pruefungen["5"]?.datum) pruefungen["5"] = { ...pruefungen["5"], datum: s.examDate };
  return { ziel: k.ziel ?? 5, pruefungen };
}

// Eine Zeile zum Antippen: offen → übe ich → sitzt
function Zeile({ name, de, status, onTap, extra }: { name: string; de?: string; status: Status; onTap: () => void; extra?: React.ReactNode }) {
  return (
    <div className="kp-row">
      <button type="button" className="kp-check" data-state={status} onClick={onTap} aria-label={`${name}: ${STATUS_WORT[status]}. Tippen für ${STATUS_WORT[NEXT[status]]}.`}>
        <span className="kp-mark" aria-hidden="true">{MARK[status]}</span>
        <span className="kp-text">
          <span>{name}</span>
          {(de || status !== "offen") && <span className="meta">{[de, status !== "offen" ? STATUS_WORT[status] : ""].filter(Boolean).join(" · ")}</span>}
        </span>
      </button>
      {extra}
    </div>
  );
}

export default function KarateSection() {
  const [settings, setSettings] = useState<Settings>({});
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<Map<string, Status>>(new Map());
  const [weeks, setWeeks] = useState<number[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showRep, setShowRep] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Kihon");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const from = isoDay(weekStart(daysAgo(7 * 7)));
    const [s, it, pr, p, a, inj] = await Promise.all([
      loadSettings(sb),
      sb.from("karate_items").select("id, label, category, status, kyu").order("created_at"),
      sb.from("karate_progress").select("item_key, status"),
      sb.from("planned_sessions").select("day").eq("sport", "karate").eq("status", "erledigt").gte("day", from),
      sb.from("garmin_activities").select("type_key, start_local, sport_override").gte("start_local", from),
      sb.from("injuries").select("*").is("ended_on", null),
    ]);
    setSettings(s);
    if (it.error || pr.error) setError("Prüfungsprogramm konnte nicht geladen werden: " + (it.error ?? pr.error)?.message);
    setItems((it.data ?? []) as Item[]);
    setProgress(new Map(((pr.data ?? []) as { item_key: string; status: Status }[]).map((r) => [r.item_key, r.status])));
    setInjuries((inj.data ?? []) as Injury[]);
    const days = new Set<string>(((p.data ?? []) as { day: string }[]).map((r) => r.day));
    for (const r of (a.data ?? []) as { type_key: string | null; start_local: string | null; sport_override?: string | null }[]) {
      if (sportOf(r) === "karate" && r.start_local) days.add(r.start_local.slice(0, 10));
    }
    const now = weekStart(new Date()).getTime();
    const counts = Array.from({ length: 8 }, () => 0);
    for (const d of days) {
      const w = Math.round((now - weekStart(fromIso(d)).getTime()) / (7 * 864e5));
      if (w >= 0 && w < 8) counts[7 - w] += 1;
    }
    setWeeks(counts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sb = supabase();
  if (!sb) return null;

  const { ziel, pruefungen } = karateZiel(settings);
  const kyu = sel ?? Math.max(ziel, 1);
  const pr = pruefungen[String(kyu)] ?? {};
  const bestanden = kyu > ziel;
  const today = isoDay();

  const saveKarate = async (next: KarateSettings) => {
    const s: Settings = { ...settings, karate: next, examDate: next.pruefungen?.[String(next.ziel ?? 5)]?.datum };
    setSettings(s);
    const { error: e } = await saveSettings(sb, s);
    setError(e ? "Das wurde nicht gespeichert: " + e.message : "");
  };
  const setDatum = (v: string) => saveKarate({ ziel, pruefungen: { ...pruefungen, [kyu]: { ...pr, datum: v || undefined } } });
  const markBestanden = () => {
    const next = kyu - 1;
    saveKarate({ ziel: next, pruefungen: { ...pruefungen, [kyu]: { ...pr, bestanden: today } } });
    setSel(next >= 1 ? next : kyu);
  };
  const undoBestanden = () => saveKarate({ ziel: kyu, pruefungen: { ...pruefungen, [kyu]: { ...pr, bestanden: undefined } } });

  const setStatus = async (key: string, status: Status) => {
    setProgress((m) => new Map(m).set(key, status));
    const { error: e } = await sb.from("karate_progress").upsert({ item_key: key, status, updated_at: new Date().toISOString() }, { onConflict: "user_id,item_key" });
    if (e) {
      setError("Das wurde nicht gespeichert: " + e.message);
      load();
    } else setError("");
  };
  const run = async (q: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: e } = await q;
    setError(e ? "Das hat nicht geklappt: " + e.message : "");
    load();
  };
  const toggle = (key: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const punkte = grad(kyu).punkte;
  const haupt = punkte.filter((p) => !p.wiederholung);
  const rep = punkte.filter((p) => p.wiederholung);
  const eigene = items.filter((i) => (i.kyu ?? 5) === kyu);
  const zaehl = (list: Status[]) => ({ sitzt: list.filter((s) => s === "sitzt").length, total: list.length });
  // Begriffe prüft der DKV nicht, sie zählen deshalb nicht im Ring
  const gruppen = GRUPPEN.filter((g) => g !== "Begriffe").map((g) => ({ gruppe: g, ...zaehl(haupt.filter((p) => p.gruppe === g).map((p) => stand(p, progress))) }));
  const eigenStand = zaehl(eigene.map((i) => i.status));
  const sitzt = gruppen.reduce((a, g) => a + g.sitzt, 0) + eigenStand.sitzt;
  const total = gruppen.reduce((a, g) => a + g.total, 0) + eigenStand.total;
  const pct = total ? Math.round((sitzt / total) * 100) : 0;
  const repStand = zaehl(rep.map((p) => stand(p, progress)));
  const r = 23;
  const c = 2 * Math.PI * r;

  const weeksLeft = pr.datum ? Math.ceil((fromIso(pr.datum).getTime() - fromIso(today).getTime()) / (7 * 864e5)) : null;
  const trainings = weeks.reduce((a, b) => a + b, 0);

  const renderPunkt = (p: Punkt) => {
    const st = stand(p, progress);
    const offen = open.has(p.key);
    const teileSitzen = p.teile?.filter((t) => progress.get(t.key) === "sitzt").length ?? 0;
    return (
      <div key={p.key} className="kp-item">
        <Zeile
          name={p.name}
          de={p.de}
          status={st}
          onTap={() => setStatus(p.key, NEXT[st])}
          extra={
            p.teile ? (
              <button type="button" className="btn btn-link kp-more" aria-expanded={offen} onClick={() => toggle(p.key)} aria-label={`Teile von ${p.name}, ${teileSitzen} von ${p.teile.length} sitzen`}>
                {teileSitzen}/{p.teile.length} {offen ? "▴" : "▾"}
              </button>
            ) : undefined
          }
        />
        {offen && p.teile && (
          <div className="kp-teile">
            {p.teile.map((t) => {
              const ts = progress.get(t.key) ?? "offen";
              return <Zeile key={t.key} name={t.name} status={ts} onTap={() => setStatus(t.key, NEXT[ts])} />;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <div className="card-row">
          <div className="stack">
            <span className="meta">Prüfung zum {kyu}. Kyu · {grad(kyu).guertel}</span>
            {bestanden ? (
              <span className="big-number">bestanden</span>
            ) : (
              <span className="big-number">{pr.datum ? (weeksLeft !== null && weeksLeft >= 0 ? `noch ${weeksLeft} ${weeksLeft === 1 ? "Woche" : "Wochen"}` : "Datum vorbei") : "Datum offen"}</span>
            )}
            <span className="meta">
              {bestanden ? (pr.bestanden ? `am ${longDate(fromIso(pr.bestanden))}` : "vor der App") : pr.datum ? longDate(fromIso(pr.datum)) : "Trag das Datum ein, sobald es feststeht."}
            </span>
          </div>
        </div>
        {!bestanden && (
          <>
            <label className="label" htmlFor="exam">Prüfungsdatum</label>
            <input id="exam" type="date" className="input" value={pr.datum ?? ""} onChange={(e) => setDatum(e.target.value)} />
          </>
        )}
        {!bestanden && kyu === ziel && pr.datum && pr.datum <= today && (
          <button type="button" className="btn btn-primary" onClick={markBestanden}>
            {kyu}. Kyu bestanden
          </button>
        )}
        {bestanden && kyu === ziel + 1 && pr.bestanden && (
          <button type="button" className="btn btn-link" onClick={undoBestanden}>
            Zurücknehmen, doch nicht bestanden
          </button>
        )}
        {ziel === 0 && <p>Alle Kyu-Prüfungen bestanden. Glückwunsch!</p>}
      </section>

      <section className="card">
        <div className="card-row">
          <h2>Trainings pro Woche</h2>
          <span className="meta">{trainings} in 8 Wochen</span>
        </div>
        <div className="bars small" role="img" aria-label={`Karate-Trainings der letzten 8 Wochen, insgesamt ${trainings}`}>
          {weeks.map((n, i) => (
            <div key={i} className="bar-col">
              <span className="bar-val">{n || ""}</span>
              <span className="bar" style={{ height: Math.max(3, n * 18) + "px", background: i === 7 ? "var(--training)" : "var(--line-strong)" }} />
            </div>
          ))}
        </div>
        <span className="meta">Erledigte Einheiten aus dem Kalender und Karate aus Garmin.</span>
      </section>

      {injuries.map((inj) =>
        SPOTS[inj.spot] ? (
          <p key={inj.id} className="kyu">
            {SPOTS[inj.spot].label} verletzt. {SPOTS[inj.spot].kyu.replace("5. Kyu", `${Math.max(ziel, 1)}. Kyu`)}
          </p>
        ) : null
      )}

      <section className="card">
        <h2>Prüfungsprogramm</h2>
        <div className="pills wrap" role="group" aria-label="Kyu wählen">
          {KYUS.map((k) => (
            <button key={k} type="button" className="pill kp-chip" aria-pressed={k === kyu} onClick={() => setSel(k)} aria-label={`${k}. Kyu${k > ziel ? ", bestanden" : k === ziel ? ", nächste Prüfung" : ""}`}>
              {k}. Kyu{k > ziel ? " ✓" : ""}
            </button>
          ))}
        </div>

        <div className="kp-head">
          <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${sitzt} von ${total} Punkten sitzen`} className="cb cb-training habit-ring">
            <g transform="rotate(-90 28 28)" fill="none">
              <circle cx="28" cy="28" r={r} strokeWidth="5" className="cb-ring-track" />
              {pct > 0 && <circle cx="28" cy="28" r={r} strokeWidth="5" strokeLinecap="round" className="cb-ring-value" style={{ strokeDasharray: `${(pct / 100) * c} ${c}` }} />}
            </g>
            <text x="28" y="32" textAnchor="middle" className="habit-ring-text">{pct}%</text>
          </svg>
          <div className="stack">
            <span className="row-strong">{sitzt} von {total} sitzen</span>
            <span className="meta">{satz(gruppen)}</span>
          </div>
        </div>

        {GRUPPEN.map((g) => {
          const list = haupt.filter((p) => p.gruppe === g);
          if (!list.length) return null;
          const z = gruppen.find((x) => x.gruppe === g) ?? { gruppe: g, ...zaehl(list.map((p) => stand(p, progress))) };
          return (
            <div key={g} className="stack">
              <div className="card-row">
                <span className="eyebrow">{g}</span>
                <span className="meta">{z.sitzt} von {z.total}</span>
              </div>
              {g === "Kihon" && (
                <div className="kp-note">
                  {HINWEISE.map((h) => <span key={h} className="meta">{h}</span>)}
                  <details>
                    <summary className="meta">Kürzel</summary>
                    <span className="meta">{KUERZEL}</span>
                  </details>
                </div>
              )}
              {list.map(renderPunkt)}
            </div>
          );
        })}

        {rep.length > 0 && (
          <div className="stack">
            <button type="button" className="kp-rep" aria-expanded={showRep} onClick={() => setShowRep((v) => !v)}>
              <span className="eyebrow">Wiederholung</span>
              <span className="meta">{repStand.sitzt} von {repStand.total} sitzen {showRep ? "▴" : "▾"}</span>
            </button>
            {showRep && rep.map(renderPunkt)}
          </div>
        )}

        <div className="stack">
          <div className="card-row">
            <span className="eyebrow">Eigene Punkte</span>
            {eigene.length > 0 && <span className="meta">{eigene.filter((i) => i.status === "sitzt").length} von {eigene.length}</span>}
          </div>
          {!eigene.length && <span className="meta">Was dein Trainer dir mitgibt oder was noch wackelt, trägst du hier ein.</span>}
          {eigene.map((i) => (
            <Zeile
              key={i.id}
              name={i.label}
              de={i.category}
              status={i.status}
              onTap={() => run(sb.from("karate_items").update({ status: NEXT[i.status], done: NEXT[i.status] === "sitzt" }).eq("id", i.id))}
              extra={<button type="button" className="btn btn-link kp-more" aria-label={`${i.label} löschen`} onClick={() => run(sb.from("karate_items").delete().eq("id", i.id))}>×</button>}
            />
          ))}
          <div className="pills wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" className="pill pill-sm" aria-pressed={category === cat} onClick={() => setCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input className="input" placeholder="Neuer Punkt" value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Neuer eigener Punkt für den ${kyu}. Kyu`} />
            <button
              type="button"
              className="btn btn-quiet"
              disabled={!label.trim()}
              onClick={() => {
                run(sb.from("karate_items").insert({ label: label.trim(), category, kyu }));
                setLabel("");
              }}
            >
              Hinzufügen
            </button>
          </div>
        </div>

        <span className="meta">{QUELLE.beispiel ? `Beispielinhalt: ${QUELLE.text}` : QUELLE.text}</span>
      </section>
    </>
  );
}
