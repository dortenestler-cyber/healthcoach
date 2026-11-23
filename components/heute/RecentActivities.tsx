import Link from "next/link";
import SportIcon from "@/components/ui/SportIcon";
import type { Data } from "@/lib/insights";
import { hm } from "@/lib/today";
import { sportOf, SPORTS } from "@/lib/training";

const WEEKDAY = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function when(day: string, ref: string): string {
  const diff = Math.round((new Date(ref + "T12:00:00").getTime() - new Date(day + "T12:00:00").getTime()) / 864e5);
  if (diff === 0) return "heute";
  if (diff === 1) return "gestern";
  if (diff < 7) return WEEKDAY[new Date(day + "T12:00:00").getDay()];
  return new Date(day + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

// „Letzte Aktivitäten“ (nach Sonar): die letzten zwei Einheiten bis zum gewählten Tag, mit Sport-Symbol, Dauer und Last.
export default function RecentActivities({ day, data }: { day: string; data: Data }) {
  const acts = data.acts
    .filter((a) => a.start_local && a.start_local.slice(0, 10) <= day)
    .sort((a, b) => (b.start_local ?? "").localeCompare(a.start_local ?? ""))
    .slice(0, 2);
  if (!acts.length) return null;

  return (
    <section aria-label="Letzte Aktivitäten">
      <div className="sec-head">
        <h2 className="sec-title">Letzte Aktivitäten</h2>
        <Link href="/training" className="sec-link">
          Alle ›
        </Link>
      </div>
      <div className="card today-acts">
        {acts.map((a) => {
          const sport = sportOf(a);
          const parts = [when((a.start_local as string).slice(0, 10), day)];
          if (a.duration_s) parts.push(hm(a.duration_s / 3600));
          if (a.training_load) parts.push(`Belastung ${Math.round(a.training_load)}`);
          return (
            <Link key={a.activity_id} href="/training" className="today-act">
              <span className="today-act-icon is-training" aria-hidden="true">
                <SportIcon sport={sport} size={20} />
              </span>
              <span className="today-act-text">
                <span className="today-act-title">{sport === "sonstiges" && a.name ? a.name : SPORTS[sport].label}</span>
                <span className="today-act-sub">{parts.join(" · ")}</span>
              </span>
              <span className="today-act-chev" aria-hidden="true">›</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
