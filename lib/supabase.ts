"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Öffentliche Werte aus .env.local bzw. den Umgebungsvariablen bei Vercel.
// Der Schlüssel ist der öffentliche ("publishable"/"anon") Schlüssel.
// Die Daten schützt der Zugriffsschutz pro Konto in der Datenbank.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}
