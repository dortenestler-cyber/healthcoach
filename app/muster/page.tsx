import { redirect } from "next/navigation";

// Muster stehen jetzt unter Gesundheit › Überblick (mit Zyklusbezug auf der Seite Zyklus).
export default function MusterPage() {
  redirect("/gesundheit");
}
