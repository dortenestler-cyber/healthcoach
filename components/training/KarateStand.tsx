"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSettings } from "@/lib/training";
import type { Status } from "@/lib/karate/programm";
import { fortschritt, type KarateMerk } from "@/lib/karate/ueben";

// Karate-Kachel auf Training › Übersicht: „12/31 sitzen · 5. Kyu“ (Zielkarte im Kleinen, Paket 9)
export default function KarateStand({ ersatz }: { ersatz: string }) {
  const [text, setText] = useState<{ wert: string; note: string } | null>(null);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    Promise.all([loadSettings(sb), sb.from("karate_progress").select("item_key, status"), sb.from("karate_items").select("kyu, status")]).then(([s, pr, it]) => {
      if (pr.error) return;
      const kyu = Math.max(((s.karate ?? {}) as KarateMerk).ziel ?? 5, 1);
      const f = fortschritt(kyu, new Map(((pr.data ?? []) as { item_key: string; status: Status }[]).map((r) => [r.item_key, r.status])), (it.data ?? []) as { kyu: number | null; status: Status }[]);
      setText({ wert: `${f.sitzt}/${f.total}`, note: `sitzen · ${kyu}. Kyu` });
    });
  }, []);
  return (
    <>
      <span className="sport-kachel-wert">{text?.wert ?? ersatz}</span>
      <span className="meta">{text?.note ?? "in 4 Wochen"}</span>
    </>
  );
}
