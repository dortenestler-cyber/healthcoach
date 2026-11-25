"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay, longDate } from "@/lib/dates";
import { SPOTS, kyuHinweis, weekStart, type Injury } from "@/lib/health";
import { fromIso, loadSettings, saveSettings, sportOf, type Settings } from "@/lib/training";
import { useAnsicht } from "@/lib/ansicht";
import { Details, Pille, PillenZeile } from "@/components/ui/Pille";
import Zielkarte from "@/components/training/Zielkarte";
import KarateUeben from "@/components/training/KarateUeben";
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
  // Eine Gruppe zur Zeit, Filter „Noch zu üben“ · „Alles“ (Konzept Einfach, Paket 9), beides gemerkt
  const [gruppe, setGruppe] = useAnsicht<string>("karate.gruppe", "Kihon");
  const [filter, setFilter] = useAnsicht<"offen" | "alles">("karate.filter", "offen");
  const [version, setVersion] = useState(0); // „Als Nächstes üben“ neu wählen, wenn sich hier etwas ändert

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
    // Frisch laden: „Heute üben“ merkt sich Tage in settings.data.karate, die sollen erhalten bleiben
    const fresh = await loadSettings(sb);
    const s: Settings = { ...fresh, karate: { ...((fresh.karate ?? {}) as object), ...next }, examDate: next.pruefungen?.[String(next.ziel ?? 5)]?.datum };
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
    } else {
      setError("");
      setVersion((v) => v + 1);
    }
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

  const zeigeFilter = (p: Punkt) => filter === "alles" || stand(p, progress) !== "sitzt";
  const GRUPPEN_PILLEN = [...GRUPPEN, "Eigene"];
  const aktiv = GRUPPEN_PILLEN.includes(gruppe) ? gruppe : "Kihon";
  const zeitText = bestanden ? "bestanden" : pr.datum ? (weeksLeft !== null && weeksLeft >= 0 ? `noch ${weeksLeft} ${weeksLeft === 1 ? "Woche" : "Wochen"}` : "Datum vorbei") : "Datum offen";
  const zeitNote = bestanden ? (pr.bestanden ? `am ${longDate(fromIso(pr.bestanden))}` : "vor der App") : pr.datum ? longDate(fromIso(pr.datum)) : undefined;

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}

      <Zielkarte ziel={`Prüfung zum ${kyu}. Kyu · ${grad(kyu).guertel}`} zeit={zeitText} zeitNote={zeitNote} anteil={total ? sitzt / total : 0} mitte={`${sitzt}/${total}`} wort="sitzen" satz={satz(gruppen) || "Noch keine Punkte."}>
        {!bestanden && (
          <Details id="karate.datum" label={pr.datum ? "Datum ändern" : "Datum eintragen"} offen={!pr.datum}>
            <label className="label" htmlFor="exam">Prüfungsdatum</label>
            <input id="exam" type="date" className="input" value={pr.datum ?? ""} onChange={(e) => setDatum(e.target.value)} />
          </Details>
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
      </Zielkarte>

      {ziel >= 1 && kyu === ziel && <KarateUeben key={version} tag={today} art="naechstes" onChanged={load} />}

      <section className="card">
        <h2>Prüfungsprogramm</h2>
        <PillenZeile label="Kyu wählen">
          {KYUS.map((k) => (
            <Pille key={k} an={k === kyu} onClick={() => setSel(k)} label={`${k}. Kyu${k > ziel ? ", bestanden" : k === ziel ? ", nächste Prüfung" : ""}`}>
              {k}. Kyu{k > ziel ? " ✓" : ""}
            </Pille>
          ))}
        </PillenZeile>
        <PillenZeile label="Gruppe wählen" scroll>
          {GRUPPEN_PILLEN.map((g) => {
            const z = gruppen.find((x) => x.gruppe === g);
            return (
              <Pille key={g} an={aktiv === g} onClick={() => setGruppe(g)} art="abschnitt">
                {g}{z && z.total ? ` ${z.sitzt}/${z.total}` : g === "Eigene" && eigene.length ? ` ${eigenStand.sitzt}/${eigenStand.total}` : ""}
              </Pille>
            );
          })}
        </PillenZeile>
        <div className="segmented kp-filter" role="group" aria-label="Was zeigen">
          <button type="button" aria-pressed={filter === "offen"} onClick={() => setFilter("offen")}>Noch zu üben</button>
          <button type="button" aria-pressed={filter === "alles"} onClick={() => setFilter("alles")}>Alles</button>
        </div>

        {aktiv !== "Eigene" && (() => {
          const list = haupt.filter((p) => p.gruppe === aktiv);
          const sichtbar = list.filter(zeigeFilter);
          const repListe = aktiv === "Kata" ? rep.filter(zeigeFilter) : [];
          return (
            <div className="stack">
              {aktiv === "Kihon" && (
                <Details id="karate.hinweise" label="Hinweise und Kürzel">
                  <div className="kp-note">
                    {HINWEISE.map((h) => <span key={h} className="meta">{h}</span>)}
                    <span className="meta">{KUERZEL}</span>
                  </div>
                </Details>
              )}
              {list.length > 0 && !sichtbar.length && <p className="meta">In {aktiv} sitzt alles. „Alles“ zeigt die Punkte.</p>}
              {sichtbar.map(renderPunkt)}
              {aktiv === "Kata" && rep.length > 0 && (
                <>
                  <button type="button" className="kp-rep" aria-expanded={showRep} onClick={() => setShowRep((v) => !v)}>
                    <span className="eyebrow">Wiederholung</span>
                    <span className="meta">{repStand.sitzt} von {repStand.total} sitzen {showRep ? "▴" : "▾"}</span>
                  </button>
                  {showRep && repListe.map(renderPunkt)}
                </>
              )}
            </div>
          );
        })()}

        {aktiv === "Eigene" && (
        <div className="stack">
          {!eigene.length && <span className="meta">Was dein Trainer dir mitgibt oder was noch wackelt, trägst du hier ein.</span>}
          {eigene.filter((i) => filter === "alles" || i.status !== "sitzt").map((i) => (
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
        )}
      </section>

      <section className="card">
        <h2>Training und Hinweise</h2>
        <span className="meta">{trainings} Karate-Trainings in 8 Wochen{injuries.some((i) => SPOTS[i.spot]) ? " · Hinweis bei Verletzung" : ""}</span>
        <Details id="karate.training" label="Trainings je Woche, Verletzung und Quelle">
          <div className="bars small" role="img" aria-label={`Karate-Trainings der letzten 8 Wochen, insgesamt ${trainings}`}>
            {weeks.map((n, i) => (
              <div key={i} className="bar-col">
                <span className="bar-val">{n || ""}</span>
                <span className="bar" style={{ height: Math.max(3, n * 18) + "px", background: i === 7 ? "var(--training)" : "var(--line-strong)" }} />
              </div>
            ))}
          </div>
          <span className="meta">Erledigte Einheiten aus dem Kalender und Karate aus Garmin.</span>
          {injuries.map((inj) =>
            SPOTS[inj.spot] ? (
              <p key={inj.id} className="kyu">
                {SPOTS[inj.spot].label} verletzt. {kyuHinweis(inj.spot, ziel)}
              </p>
            ) : null
          )}
          <span className="meta">{QUELLE.beispiel ? `Beispielinhalt: ${QUELLE.text}` : QUELLE.text}</span>
        </Details>
      </section>
    </>
  );
}
