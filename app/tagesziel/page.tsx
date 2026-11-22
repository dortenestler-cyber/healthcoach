import { redirect } from "next/navigation";

// Das Tagesziel steht jetzt unter Training › Auswertung.
export default function TageszielPage() {
  redirect("/training?t=auswertung");
}
