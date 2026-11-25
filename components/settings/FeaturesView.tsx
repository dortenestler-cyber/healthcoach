"use client";

import PageHead from "@/components/PageHead";
import { Group, Row, Toggle } from "@/components/SettingsView";
import { applyProfile, currentProfile, FEATURES, PROFILES, setFeature, useFeatures } from "@/lib/prefs";

// Bereiche ein- und ausblenden. Ausgeblendet heißt nur: nicht angezeigt. Daten bleiben erhalten.
export default function FeaturesView() {
  const f = useFeatures();
  const profile = currentProfile(f);
  return (
    <>
      <PageHead title="Funktionen" />
      <Group title="Profil">
        {PROFILES.map((p) => (
          <Row key={p.key} label={p.label + (profile === p.key ? " ✓" : "")} note={p.note} onClick={() => applyProfile(p.key)} />
        ))}
        {!profile && <p className="settings-note">Eigene Auswahl. Ein Profil setzt alle Schalter neu.</p>}
      </Group>
      <Group title="Einzeln">
        {FEATURES.map((x) => (
          <Toggle key={x.key} label={x.label} note={x.note} on={f[x.key]} onChange={() => setFeature(x.key, !f[x.key])} />
        ))}
        <p className="settings-note">Ausgeblendete Bereiche verschwinden nur aus der Ansicht. Deine Einträge bleiben gespeichert und der Coach kennt sie weiter.</p>
      </Group>
    </>
  );
}
