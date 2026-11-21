import Toybox.ActivityMonitor;
import Toybox.Activity;
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Weather;
import Toybox.WatchUi;

// Zifferblatt "Datenraster": schwarz, weiße Schrift, Werte in einem Raster
class FaceView extends WatchUi.WatchFace {

    var sleeping = false;
    const DAYS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
    const MONTHS = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];

    function initialize() {
        WatchFace.initialize();
    }

    function onEnterSleep() {
        sleeping = true;
        WatchUi.requestUpdate();
    }

    function onExitSleep() {
        sleeping = false;
        WatchUi.requestUpdate();
    }

    function onUpdate(dc) {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var clock = System.getClockTime();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        var settings = System.getDeviceSettings();
        var timeText = hhmm(clock.hour, clock.min, settings.is24Hour);

        // Ruhemodus bei AMOLED: nur gedimmte Uhrzeit, die jede Minute etwas wandert (Schutz vor Einbrennen)
        if (sleeping && (settings has :requiresBurnInProtection) && settings.requiresBurnInProtection) {
            var dx = ((clock.min % 5) - 2) * 6;
            var dy = (((clock.min / 5) % 5) - 2) * 6;
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2 + dx, h / 2 + dy, Graphics.FONT_NUMBER_MEDIUM, timeText, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }

        var hc = Application.Storage.getValue("today");
        if (!(hc instanceof Dictionary)) {
            hc = null;
        }
        var fs = Graphics.FONT_XTINY;
        var fh = dc.getFontHeight(fs);
        var ic = (fh * 0.7).toNumber();
        var grey = Graphics.COLOR_LT_GRAY;

        // Datum
        var now = Time.now();
        var d = Gregorian.info(now, Time.FORMAT_SHORT);
        dc.setColor(grey, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, (h * 0.13).toNumber(), Graphics.FONT_TINY, DAYS[d.day_of_week - 1] + " " + d.day.toString() + ". " + MONTHS[d.month - 1], Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Body Battery und Zyklustag
        var yTop = (h * 0.24).toNumber();
        cell(dc, "bb", bodyBattery(), w * 0.36, yTop, fs, ic);
        var ct = "–";
        if (hc != null && hc["cycleDay"] != null) {
            ct = "ZT " + hc["cycleDay"].toString();
        }
        cell(dc, "cycle", ct, w * 0.64, yTop, fs, ic);

        // Uhrzeit
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, (h * 0.40).toNumber(), Graphics.FONT_NUMBER_HOT, timeText, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Trennlinien
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        var l1 = (h * 0.54).toNumber();
        var l2 = (h * 0.66).toNumber();
        var l3 = (h * 0.78).toNumber();
        dc.drawLine((w * 0.12).toNumber(), l1, (w * 0.88).toNumber(), l1);
        dc.drawLine((w * 0.08).toNumber(), l2, (w * 0.92).toNumber(), l2);
        dc.drawLine((w * 0.12).toNumber(), l3, (w * 0.88).toNumber(), l3);

        // Wetter: Sonnenauf- und -untergang, Temperatur, Regen
        var yW = (l1 + l2) / 2;
        var sun = sunTimes(settings.is24Hour);
        cell(dc, "sun", sun, w * 0.33, yW, fs, ic);
        var cond = null;
        if (Toybox has :Weather) {
            cond = Weather.getCurrentConditions();
        }
        var temp = "–";
        var rain = "–";
        if (cond != null) {
            if (cond.temperature != null) {
                temp = cond.temperature.toNumber().toString() + "°";
            }
            if (cond.precipitationChance != null) {
                rain = cond.precipitationChance.toString() + "%";
            }
        }
        cell(dc, "cloud", temp, w * 0.62, yW, fs, ic);
        cell(dc, "drop", rain, w * 0.80, yW, fs, ic);

        // Puls, Schritte, Mitteilungen
        var yA = (l2 + l3) / 2;
        var hr = "–";
        var ai = Activity.getActivityInfo();
        if (ai != null && ai.currentHeartRate != null) {
            hr = ai.currentHeartRate.toString();
        }
        var steps = "–";
        var am = ActivityMonitor.getInfo();
        if (am != null && am.steps != null) {
            steps = am.steps.toString();
        }
        cell(dc, "heart", hr, w * 0.24, yA, fs, ic);
        cell(dc, "steps", steps, w * 0.50, yA, fs, ic);
        cell(dc, "bell", settings.notificationCount.toString(), w * 0.76, yA, fs, ic);

        // Health Coach: nächste Einheit und Bufori-Hübe
        var yH = (h * 0.86).toNumber();
        if (hc == null) {
            dc.setColor(grey, Graphics.COLOR_TRANSPARENT);
            var hint = "HEALTH COACH";
            var tok = Application.Properties.getValue("token");
            if (tok == null || !(tok instanceof String) || tok.length() < 10) {
                hint = "SCHLÜSSEL FEHLT";
            }
            dc.drawText(w / 2, yH, fs, hint, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        } else {
            var nextText = "FREI";
            if (hc["pause"] == true) {
                nextText = "PAUSE";
            } else if (hc["next"] instanceof Dictionary) {
                var n = hc["next"];
                nextText = shorten(n["label"], 10);
                if (n["time"] != null && n["time"] instanceof String && n["time"].length() > 0) {
                    nextText = n["time"] + " " + nextText;
                }
                if (n["done"] == true) {
                    nextText = "OK " + nextText;
                }
            }
            cell(dc, "kb", nextText, w * 0.40, yH, fs, ic);
            var hubs = hc["hubs"] != null ? hc["hubs"].toString() : "0";
            cell(dc, "inhaler", hubs, w * 0.76, yH, fs, ic);
        }
    }

    // Icon links, Wert rechts daneben, zusammen um x zentriert
    function cell(dc, icon, text, x, y, font, s) {
        var tw = dc.getTextWidthInPixels(text, font);
        var gap = s / 3;
        var total = s + gap + tw;
        var left = (x - total / 2).toNumber();
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        Icons.draw(dc, icon, left, y - s / 2, s);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(left + s + gap, y, font, text, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function hhmm(hour, min, is24) {
        var hr = hour;
        if (!is24) {
            hr = hour % 12;
            if (hr == 0) {
                hr = 12;
            }
        }
        return hr.format("%02d") + ":" + min.format("%02d");
    }

    function shorten(s, n) {
        if (s == null || !(s instanceof String)) {
            return "–";
        }
        var u = s.toUpper();
        if (u.length() > n) {
            return u.substring(0, n);
        }
        return u;
    }

    function bodyBattery() {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getBodyBatteryHistory)) {
            var it = SensorHistory.getBodyBatteryHistory({:period => 1});
            if (it != null) {
                var s = it.next();
                if (s != null && s.data != null) {
                    return s.data.toNumber().toString();
                }
            }
        }
        return "–";
    }

    function sunTimes(is24) {
        if (!(Toybox has :Weather) || !(Weather has :getSunrise)) {
            return "–";
        }
        var cond = Weather.getCurrentConditions();
        if (cond == null || cond.observationLocationPosition == null) {
            return "–";
        }
        var now = Time.now();
        var rise = Weather.getSunrise(cond.observationLocationPosition, now);
        var set = Weather.getSunset(cond.observationLocationPosition, now);
        if (rise == null || set == null) {
            return "–";
        }
        // Aufgang und Untergang von heute
        var ri = Gregorian.info(rise, Time.FORMAT_SHORT);
        var si = Gregorian.info(set, Time.FORMAT_SHORT);
        return hhmm(ri.hour, ri.min, is24) + " " + hhmm(si.hour, si.min, is24);
    }
}
