import Toybox.ActivityMonitor;
import Toybox.Activity;
import Toybox.Application;
import Toybox.Lang;
import Toybox.Position;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Weather;

// Wählbare Werte für die Felder des Zifferblatts.
// Die Nummern sind die Werte der Auswahllisten in Garmin Connect (settings.xml), nicht ändern.
module Fields {

    // Icon und Geisterziffern je Wert (Index = Nummer aus den Einstellungen)
    const ICON = [null, "bb", "cy", "su", "sd", "cl", "dr", "he", "fl", "st", "ta", "be", "hg", "kb", "in",
        "stress", "rhr", "floors", "intens", "kcal", "dist", "spo2", "resp", "alt", "press", "batt", "alarm", "move", "recov",
        "hrv", "sleep", null, "ready", "phase", "pill"];
    const GHOST = ["", "88", "88", "8888", "8888", "8°", "88", "88", "8", "8888", "88", "8", "88", "88:88", "8",
        "88", "88", "88", "888", "8888", "88,8", "88", "88", "8888", "8888", "88", "8", "8", "88",
        "88", "88", "", "8,8", "8888", "8"];

    // Farbfamilie je Wert für den Farbmodus "Bedeutung" (Farbsystem "Nacht"):
    // 0 neutral, 1 Erholung, 2 Energie, 3 Schlaf, 4 Zyklus, 5 Symptome, 6 Training, 7 Alltag, 8 Stress
    const FAM = [0, 2, 4, 0, 0, 0, 0, 0, 5, 7, 6, 0, 6, 6, 5,
        8, 1, 7, 6, 0, 7, 0, 0, 0, 0, 0, 0, 7, 6,
        1, 3, 0, 1, 4, 0];
    // Familie je Strich-Anzeige (Nummern wie in settings.xml)
    const GFAM = [0, 6, 0, 2, 7, 8, 7, 6, 7, 1];
    const FAMCOL = [-1, 0x52B788, 0x8FD5B0, 0xE5E7EB, 0xE8845A, 0xF0A24A, 0x7C9AE0, 0xC3D1F2, 0x45C4C0];

    const NONE = "--";

    // Messwert für ein Feld als Text. hc = Kurzübersicht aus Health Coach oder null.
    function value(t, hc, ctx) {
        if (t == 1) { return bodyBattery(); }
        if (t == 2) { return hcNum(hc, "cycleDay"); }
        if (t == 3) { return sun(true, ctx); }
        if (t == 4) { return sun(false, ctx); }
        if (t == 5) {
            var c = ctx[:cond];
            return (c != null && c.temperature != null) ? c.temperature.toNumber().format("%d") + "°" : NONE;
        }
        if (t == 6) {
            var c = ctx[:cond];
            return (c != null && c.precipitationChance != null) ? c.precipitationChance.format("%d") : NONE;
        }
        if (t == 7) { return heartRate(ctx); }
        if (t == 8) { return hcNum(hc, "flashes"); }
        if (t == 9) {
            var am = ctx[:am];
            return (am != null && am.steps != null) ? am.steps.format("%d") : NONE;
        }
        if (t == 10) { return hcNum(hc, "goal"); }
        if (t == 11) { return ctx[:settings].notificationCount.format("%d"); }
        if (t == 12) { return hcNum(hc, "fa"); }
        if (t == 13) { return nextUnit(hc); }
        if (t == 14) { return hcNum(hc, "hubs"); }
        if (t == 15) { return history(:getStressHistory, 1.0); }
        if (t == 16) { return hcNum(hc, "rhr"); }
        if (t == 17) {
            var am = ctx[:am];
            return (am != null && (am has :floorsClimbed) && am.floorsClimbed != null) ? am.floorsClimbed.format("%d") : NONE;
        }
        if (t == 18) {
            var am = ctx[:am];
            return (am != null && (am has :activeMinutesWeek) && am.activeMinutesWeek != null) ? am.activeMinutesWeek.total.format("%d") : NONE;
        }
        if (t == 19) {
            var am = ctx[:am];
            return (am != null && am.calories != null) ? am.calories.format("%d") : NONE;
        }
        if (t == 20) {
            var am = ctx[:am];
            return (am != null && am.distance != null) ? comma(am.distance / 100000.0) : NONE;
        }
        if (t == 21) { return history(:getOxygenSaturationHistory, 1.0); }
        if (t == 22) {
            var am = ctx[:am];
            return (am != null && (am has :respirationRate) && am.respirationRate != null) ? am.respirationRate.toNumber().format("%d") : NONE;
        }
        if (t == 23) { return history(:getElevationHistory, 1.0); }
        if (t == 24) { return history(:getPressureHistory, 0.01); }
        if (t == 25) { return System.getSystemStats().battery.toNumber().format("%d"); }
        if (t == 26) { return ctx[:settings].alarmCount.format("%d"); }
        if (t == 27) {
            var am = ctx[:am];
            return (am != null && am.moveBarLevel != null) ? am.moveBarLevel.format("%d") : NONE;
        }
        if (t == 28) {
            var am = ctx[:am];
            return (am != null && (am has :timeToRecovery) && am.timeToRecovery != null) ? am.timeToRecovery.format("%d") : NONE;
        }
        if (t == 29) { return hcNum(hc, "hrv"); }
        if (t == 30) { return hcNum(hc, "sleep"); }
        // 31 war die Hauttemperatur (entfernt, Garmin liefert sie nicht). Nummer bleibt frei.
        if (t == 31) { return NONE; }
        if (t == 32) {
            if (hc == null || hc["goal"] == null) { return NONE; }
            return comma(hc["goal"].toFloat() / 10.0);
        }
        if (t == 33) {
            return (hc != null && hc["phase"] instanceof String) ? hc["phase"] : NONE;
        }
        if (t == 34) { return hcNum(hc, "open"); }
        return "";
    }

    // Füllstand 0–1 für die seitlichen Strich-Anzeigen, null = keine Daten
    function gauge(g, hc, ctx) {
        var am = ctx[:am];
        if (g == 1) { return (hc != null && hc["goal"] != null) ? hc["goal"].toFloat() / 100.0 : null; }
        if (g == 2) { return System.getSystemStats().battery / 100.0; }
        if (g == 3) {
            var v = bodyBattery();
            return v.equals(NONE) ? null : v.toNumber() / 100.0;
        }
        if (g == 4) { return (am != null && am.steps != null && am.stepGoal != null && am.stepGoal > 0) ? am.steps.toFloat() / am.stepGoal : null; }
        if (g == 5) {
            var v = history(:getStressHistory, 1.0);
            return v.equals(NONE) ? null : v.toNumber() / 100.0;
        }
        if (g == 6) { return (am != null && am.moveBarLevel != null) ? am.moveBarLevel / 5.0 : null; }
        if (g == 7) {
            if (am == null || !(am has :activeMinutesWeek) || am.activeMinutesWeek == null || am.activeMinutesWeekGoal == null || am.activeMinutesWeekGoal == 0) { return null; }
            return am.activeMinutesWeek.total.toFloat() / am.activeMinutesWeekGoal;
        }
        if (g == 8) {
            if (am == null || !(am has :floorsClimbed) || am.floorsClimbed == null || am.floorsClimbedGoal == null || am.floorsClimbedGoal == 0) { return null; }
            return am.floorsClimbed.toFloat() / am.floorsClimbedGoal;
        }
        if (g == 9) { return (hc != null && hc["goal"] != null) ? hc["goal"].toFloat() / 100.0 : null; }
        return null;
    }

    function hcNum(hc, key) {
        if (hc == null || hc[key] == null) { return NONE; }
        var v = hc[key];
        if (v instanceof Number || v instanceof Float || v instanceof Double || v instanceof Long) {
            return v.toNumber().format("%d");
        }
        return v.toString();
    }

    // Eine Nachkommastelle mit Komma
    function comma(v) {
        return replaceDot(v.format("%.1f"));
    }

    function replaceDot(s) {
        var i = s.find(".");
        return i == null ? s : s.substring(0, i) + "," + s.substring(i + 1, s.length());
    }

    function bodyBattery() {
        return history(:getBodyBatteryHistory, 1.0);
    }

    // Letzter Wert aus dem Sensorverlauf der Uhr
    function history(fn, factor) {
        if (!(Toybox has :SensorHistory)) { return NONE; }
        var it = null;
        var o = {:period => 1};
        if (fn == :getBodyBatteryHistory && (SensorHistory has :getBodyBatteryHistory)) {
            it = SensorHistory.getBodyBatteryHistory(o);
        } else if (fn == :getStressHistory && (SensorHistory has :getStressHistory)) {
            it = SensorHistory.getStressHistory(o);
        } else if (fn == :getOxygenSaturationHistory && (SensorHistory has :getOxygenSaturationHistory)) {
            it = SensorHistory.getOxygenSaturationHistory(o);
        } else if (fn == :getElevationHistory && (SensorHistory has :getElevationHistory)) {
            it = SensorHistory.getElevationHistory(o);
        } else if (fn == :getPressureHistory && (SensorHistory has :getPressureHistory)) {
            it = SensorHistory.getPressureHistory(o);
        } else if (fn == :getHeartRateHistory && (SensorHistory has :getHeartRateHistory)) {
            it = SensorHistory.getHeartRateHistory(o);
        }
        if (it != null) {
            var s = it.next();
            if (s != null && s.data != null) {
                return (s.data * factor).toNumber().format("%d");
            }
        }
        return NONE;
    }

    function heartRate(ctx) {
        var ai = ctx[:ai];
        if (ai != null && ai.currentHeartRate != null) {
            return ai.currentHeartRate.format("%d");
        }
        return history(:getHeartRateHistory, 1.0);
    }

    // Nächste Einheit aus Health Coach: Uhrzeit, sonst Kurzname
    function nextUnit(hc) {
        if (hc == null) { return NONE; }
        if (hc["pause"] == true) { return "PAUSE"; }
        var n = hc["next"];
        if (!(n instanceof Dictionary)) { return "FREI"; }
        if (n["done"] == true) { return "OK"; }
        if (n["time"] instanceof String && n["time"].length() >= 4) { return n["time"].substring(0, 5); }
        if (n["label"] instanceof String) {
            var l = n["label"];
            return l.length() > 5 ? l.substring(0, 5) : l;
        }
        return "--:--";
    }

    // Standort für Sonnenzeiten: Wetter, sonst letzte Aktivitäts-Position, sonst letzte bekannte GPS-Position der Uhr,
    // sonst zuletzt gespeicherter Ort, sonst der Ort aus den Einstellungen (Breite/Länge in Garmin Connect).
    // Bug 26.11.2026: Wetter und Aktivität lieferten auf der Fenix 9 Pro keine Position, die Sonnenzeiten blieben leer.
    function location(ctx) {
        var c = ctx[:cond];
        var loc = null;
        if (c != null && c.observationLocationPosition != null) {
            loc = c.observationLocationPosition;
        }
        if (loc == null) {
            var ai = ctx[:ai];
            if (ai != null && ai.currentLocation != null) {
                loc = ai.currentLocation;
            }
        }
        if (loc == null && (Toybox has :Position) && (Position has :getInfo)) {
            try {
                var pi = Position.getInfo();
                if (pi != null && pi.position != null) {
                    loc = pi.position;
                }
            } catch (e) {
                loc = null;
            }
        }
        if (loc != null) {
            var deg = loc.toDegrees();
            if (deg[0] != 0.0 || deg[1] != 0.0) {
                // Nur speichern, wenn sich der Ort merklich geändert hat (schont den Speicher)
                var old = Application.Storage.getValue("loc");
                if (!(old instanceof Array) || old.size() != 2 || (old[0] - deg[0]).abs() > 0.05 || (old[1] - deg[1]).abs() > 0.05) {
                    Application.Storage.setValue("loc", [deg[0], deg[1]]);
                }
                return loc;
            }
        }
        var saved = Application.Storage.getValue("loc");
        if (saved instanceof Array && saved.size() == 2) {
            return new Position.Location({:latitude => saved[0], :longitude => saved[1], :format => :degrees});
        }
        var lat = numProp("lat");
        var lon = numProp("lon");
        if (lat != null && lon != null && (lat != 0.0 || lon != 0.0) && lat.abs() <= 90.0 && lon.abs() <= 180.0) {
            return new Position.Location({:latitude => lat, :longitude => lon, :format => :degrees});
        }
        return null;
    }

    function numProp(key) {
        var v = null;
        try {
            v = Application.Properties.getValue(key);
        } catch (e) {
            v = null;
        }
        if (v instanceof Float || v instanceof Double || v instanceof Number) {
            return v.toFloat();
        }
        return null;
    }

    function sun(rise, ctx) {
        if (!(Toybox has :Weather) || !(Weather has :getSunrise)) { return NONE; }
        var loc = ctx[:loc];
        if (loc == null) { return NONE; }
        var t = rise ? Weather.getSunrise(loc, ctx[:now]) : Weather.getSunset(loc, ctx[:now]);
        if (t == null) { return NONE; }
        var i = Gregorian.info(t, Time.FORMAT_SHORT);
        var h = i.hour;
        if (!ctx[:settings].is24Hour) {
            h = h % 12;
            if (h == 0) { h = 12; }
        }
        return h.format("%02d") + i.min.format("%02d");
    }
}
