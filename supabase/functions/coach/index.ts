// Health Coach · Edge Function "coach"
// Beantwortet Fragen im Coach-Chat mit der Claude-API.
// Die App schickt die Frage und eine kompakte Zusammenfassung des Tages, keine Rohdaten.
//
// Benötigte Secrets in Supabase (Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   Schlüssel von console.anthropic.com
//   COACH_MODEL         optional, Standard: claude-sonnet-5-5
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const DAILY_LIMIT = 40; // Schutz vor hohen Kosten: höchstens 40 Fragen pro Tag (die App kann weniger wählen)

// Preise in US-Dollar pro Million Token (Eingabe, Ausgabe), Stand November 2026.
// Unbekanntes Modell: Preise von Sonnet als Schätzung.
const PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5-5": [4, 20],
  "claude-haiku-5-5": [0.1, 0.5],
};
const HISTORY = 12; // so viele frühere Nachrichten gehen als Gesprächsverlauf mit

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Du bist der Coach in der App „Health Coach“ einer 40-jährigen Frau in der Perimenopause.
Du kennst ihr Training, ihre Erholung, ihren Zyklus, ihre Symptome und ihre Medikamente aus der Zusammenfassung unten.

Ihre Ziele:
- Karate: Kyu-Prüfungen nach der Prüfungsordnung Shotokan des DKV. Welcher Kyu als Nächstes kommt und wann, steht in der Zusammenfassung. Montag ist immer Karate.
- Bouldern: Ziel Fontainebleau 6A. Den aktuellen Stand nennt die Zusammenfassung.
- Kettlebell: allgemeiner Kraftaufbau mit Kettlebells von 1 bis 20 kg, auch Übungen mit Körpergewicht.
- Ausdauer: Joggen, Wandern, Rad fahren, Gehen. Diese Einheiten zeichnet die Garmin-Uhr auf.
- Perimenopause: Muster erkennen und das Training an Symptome und Erholung anpassen.
Sie trainiert 3 bis 4 Mal pro Woche.

So antwortest du:
- Auf Deutsch, klar und knapp, ohne Fachjargon. Meist 2 bis 6 Sätze oder eine kurze Liste. Gibt die Frage eine Form vor, folgst du genau dieser Form.
- Sie hat die App selbst gebaut und kennt ihre Werte. Du erklärst keine Begriffe und keine Rechenwege, sondern sagst, was die Zahlen für ihren Tag bedeuten und was sie konkret anders machen soll.
- Immer „Kettlebell“, nie „Glocke“.
- Du richtest Vorschläge an ihren Zielen aus und berücksichtigst Schlaf, HRV, Body Battery, Zyklusphase, Symptome, Krankheiten und Verletzungen. An schlechten Tagen schlägst du leichtere Varianten vor.
- Muster benennst du vorsichtig als Zusammenhang, nie als Beweis. Wenn Daten fehlen, sagst du das.
- Du stellst keine Diagnosen und nennst keine Medikamentendosierungen. Bei Fragen zu Dosierung oder Wechselwirkungen verweist du an Apotheke oder Arztpraxis.
- Bei Warnzeichen empfiehlst du ärztliche Abklärung: sehr starke oder anhaltende Blutungen, Blutungen nach dem Sex, Brustschmerz, starkes Herzrasen mit Schwindel, anhaltende Niedergeschlagenheit, Atemnot trotz Inhalator (dann Notruf 112), Fieber über mehrere Tage.
- Du erfindest keine Werte. Was nicht in der Zusammenfassung steht, weißt du nicht.
- Für heutige Zahlen gilt nur die Zusammenfassung unten, sie ist immer aktuell. Zahlen aus früheren Antworten im Verlauf können veraltet sein. Du korrigierst frühere Antworten nicht, entschuldigst dich nicht dafür und beginnst ohne Vorrede direkt mit der Antwort.
- Formatierung sparsam: höchstens **fett** für ein Stichwort und Listen mit „- “. Keine Überschriften, keine Tabellen.`;

// Titel eines neuen Chats: die erste Frage, gekürzt auf etwa 60 Zeichen an einer Wortgrenze
function chatTitle(q: string): string {
  const t = q.replace(/\s+/g, " ").trim();
  if (t.length <= 60) return t;
  const cut = t.slice(0, 60);
  return (cut.lastIndexOf(" ") > 30 ? cut.slice(0, cut.lastIndexOf(" ")) : cut) + " …";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY fehlt in den Supabase-Secrets." });
    const model = Deno.env.get("COACH_MODEL") || "claude-sonnet-5-5";

    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (userError || !userData.user) return json(401, { error: "Nicht angemeldet." });

    const body = await req.json().catch(() => ({}));
    // Einrichtungs-Check: Schlüssel vorhanden, Modell nennen, keine Anfrage an Claude
    if (body?.check) return json(200, { ok: true, model });
    const question = String(body?.message ?? "").trim().slice(0, 2000);
    // Tagesempfehlung und Monatsrückblick der App: ohne Verlauf, nicht gespeichert, zählt nicht zum Tageslimit
    const briefing = body?.briefing === true;
    const context = String(body?.context ?? "").slice(0, 6000);
    if (!question) return json(400, { error: "Keine Frage erhalten." });

    // Tageslimit
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count } = await sb.from("coach_messages").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", since.toISOString());
    const wanted = Number(body?.limit);
    const limit = Number.isFinite(wanted) && wanted > 0 ? Math.min(Math.round(wanted), DAILY_LIMIT) : DAILY_LIMIT;
    if (!briefing && (count ?? 0) >= limit) return json(429, { error: `Für heute sind ${limit} Fragen erreicht. Morgen geht es weiter. Das Limit stellst du in den Einstellungen ein.` });

    // Chat: bestehenden fortsetzen oder (erst nach der Antwort) neuen anlegen, Titel aus der ersten Frage.
    // Fehlt die Tabelle coach_chats noch (Migration nicht gelaufen), gilt der alte Verlauf über alle Nachrichten.
    let chatId: string | null = typeof body?.chat_id === "string" ? body.chat_id : null;
    let chats = true;
    if (chatId) {
      const { data: c, error: cErr } = await sb.from("coach_chats").select("id").eq("id", chatId).maybeSingle();
      if (cErr) chats = false;
      else if (!c) chatId = null;
    } else {
      const { error: cErr } = await sb.from("coach_chats").select("id", { count: "exact", head: true });
      if (cErr) chats = false;
    }

    // Bisheriger Verlauf: nur der aktuelle Chat, ein neuer Chat beginnt leer
    let hist: { role: "user" | "assistant"; content: string }[] = [];
    if (!briefing && (!chats || chatId)) {
      let hq = sb.from("coach_messages").select("role, content").order("created_at", { ascending: false }).limit(HISTORY);
      if (chats && chatId) hq = hq.eq("chat_id", chatId);
      hist = ((await hq).data ?? []) as typeof hist;
    }
    const messages = [...hist].reverse();
    // Die API verlangt, dass das Gespräch mit der Nutzerin beginnt und sich die Rollen abwechseln
    while (messages.length && messages[0].role !== "user") messages.shift();
    const merged: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of [...messages, { role: "user" as const, content: question }]) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) last.content += "\n\n" + m.content;
      else merged.push({ ...m });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        // Das Modell denkt vor der Antwort nach; das zählt zu max_tokens. Mit 900 brachen Antworten mitten im Satz ab.
        max_tokens: 6000,
        output_config: { effort: "low" },
        system: `${SYSTEM}\n\nZusammenfassung von heute (aus der App):\n${context || "Keine Daten mitgeschickt."}`,
        messages: merged,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json(502, { error: `Claude antwortet mit ${res.status}. ${res.status === 401 ? "Ist der ANTHROPIC_API_KEY richtig?" : res.status === 400 && t.includes("credit") ? "Ist noch Guthaben vorhanden?" : ""}`.trim() });
    }
    const out = await res.json();
    if (out?.stop_reason === "refusal") return json(502, { error: "Claude hat diese Frage nicht beantwortet. Bitte anders formulieren." });
    const answer = ((out?.content ?? []) as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
    if (!answer) return json(502, { error: "Claude hat keine Antwort geliefert." });
    // Abgeschnittene Antworten nicht speichern, sonst landen sie im Verlauf und verwirren die nächsten Antworten
    if (out?.stop_reason === "max_tokens") return json(502, { error: "Die Antwort wurde zu lang und abgeschnitten. Bitte noch einmal fragen." });

    const inTok = Number(out?.usage?.input_tokens ?? 0);
    const outTok = Number(out?.usage?.output_tokens ?? 0);
    const [pIn, pOut] = PRICES[model] ?? PRICES["claude-sonnet-5-5"];
    const cost = (inTok * pIn + outTok * pOut) / 1_000_000;

    if (briefing) return json(200, { answer, chat_id: null, used_today: count ?? 0, limit, cost_usd: cost });

    const now = Date.now();
    if (chats && !chatId) {
      const { data: c, error: cErr } = await sb.from("coach_chats").insert({ title: chatTitle(question), created_at: new Date(now).toISOString() }).select("id").single();
      if (cErr) return json(500, { error: "Chat konnte nicht angelegt werden: " + cErr.message, answer });
      chatId = c.id as string;
    }
    const chatCol = chats && chatId ? { chat_id: chatId } : {};
    const rows = [
      { role: "user", content: question, created_at: new Date(now).toISOString(), ...chatCol },
      { role: "assistant", content: answer, created_at: new Date(now + 1).toISOString(), input_tokens: inTok, output_tokens: outTok, cost_usd: cost, ...chatCol },
    ];
    let { error: insErr } = await sb.from("coach_messages").insert(rows);
    // Migration „coach_kosten“ noch nicht ausgeführt: ohne Kostenspalten speichern
    if (insErr && /input_tokens|output_tokens|cost_usd/.test(insErr.message)) {
      ({ error: insErr } = await sb.from("coach_messages").insert(rows.map(({ role, content, created_at }) => ({ role, content, created_at, ...chatCol }))));
    }
    if (insErr) return json(500, { error: "Verlauf konnte nicht gespeichert werden: " + insErr.message, answer });
    if (chats && chatId) await sb.from("coach_chats").update({ updated_at: new Date(now + 1).toISOString() }).eq("id", chatId);

    return json(200, { answer, chat_id: chats ? chatId : null, used_today: (count ?? 0) + 1, limit, cost_usd: cost });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
