import { redirect } from "next/navigation";

// Die Seite Muster heißt jetzt Zyklus. Alte Links und Lesezeichen führen dorthin.
export default function MusterPage() {
  redirect("/zyklus");
}
