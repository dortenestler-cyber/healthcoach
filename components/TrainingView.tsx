"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { daysAgo, isoDay } from "@/lib/dates";
import { activityLabel, distanceText, durationText, type Activity } from "@/lib/garmin";
import PageHead from "@/components/PageHead";

const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

// Training: erledigte Einheiten aus Garmin, Kalender und Pläne folgen in Phase 3
export default function TrainingView() {
  const [list, setList] = useState<Activity[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.from("garmin_activities")
      .select("activity_id, type_key, name, start_local, duration_s, distance_m, avg_hr, max_hr, training_load")
      .gte("start_local", isoDay(daysAgo(29)))
      .order("start_local", { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError("Trainings konnten nicht geladen werden: " + e.message);
        setList((data ?? []) as Activity[]);
      });
  }, []);

  return (
    <>
      <PageHead title="Training" sub="Karate, Klettern, Kettlebell und Ausdauer" />
      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card">
        <div className="card-row">
          <h2>Letzte 30 Tage</h2>
          <span className="meta">aus Garmin</span>
        </div>
        {list === null && <p>Lädt …</p>}
        {list && !list.length && <p>Noch keine Einheiten. Sie erscheinen nach dem Synchronisieren auf der Seite Heute.</p>}
        {list?.map((a) => {
          const d = a.start_local ? new Date(a.start_local.replace(" ", "T")) : null;
          const facts = [durationText(a.duration_s), distanceText(a.distance_m), a.avg_hr ? `Puls Ø ${a.avg_hr}` : ""].filter(Boolean).join(" · ");
          return (
            <div key={a.activity_id} className="list-row">
              <span className="list-date">{d ? `${weekdays[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.` : ""}</span>
              <div className="stack">
                <span className="row-strong">{activityLabel(a)}</span>
                <span className="meta">{facts}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>Kalender und Kettlebell-Pläne</h2>
        <p>Kommen in Phase 3, zusammen mit Klettern und der Vorbereitung auf den 5. Kyu.</p>
      </section>
    </>
  );
}
