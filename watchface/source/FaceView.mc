import Toybox.ActivityMonitor;
import Toybox.Activity;
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.UserProfile;
import Toybox.Weather;
import Toybox.WatchUi;

// Zifferblatt "Datenraster" nach dem Entwurf "Uhr-Datenraster-Lesbar" im Klick-Dummy (26.11.2026).
// Zwei Layouts: A "Ruhiges Raster" und C "Werte am Rand". Maße im 344-px-Raster des Entwurfs, auf das Display skaliert.
// Felder und Farbmodus stellt die Nutzerin in Garmin Connect ein (settings.xml).
class FaceView extends WatchUi.WatchFace {

    // Farben aus dem Konzept (Farbmodus "Einfarbig")
    const BG = 0x000000;
    const GHOST = 0x2A2B2F;
    const LINE = 0x2C2D31;
    const BRIGHT = 0xCFD0CB;
    const MUTED = 0x7E8085;
    const TIME_ON = 0xE4E5DF;
    const SEG_OFF = 0x202125;
    const SEC = 0x9C9EA3;
    const BAR_ON = 0xE4E5DF;
    const BAR_OFF = 0x2A2B2F;

    // Felder: oben 1–3, Mitte 1–3, unten 1–3, dazu ein Feld nur für Layout C (zweites Feld oben)
    const SLOT_KEYS = ["f_o1", "f_o2", "f_o3", "f_m1", "f_m2", "f_m3", "f_u1", "f_u2", "f_u3", "f_c"];
    const SLOT_DEFAULT = [3, 5, 4, 7, 10, 9, 1, 13, 14, 6];

    // 7-Segment: welche Balken je Ziffer leuchten
    const SEGS = {'0' => "abcdef", '1' => "bc", '2' => "abged", '3' => "abgcd", '4' => "fgbc", '5' => "afgcd", '6' => "afgedc", '7' => "abc", '8' => "abcdefg", '9' => "abcdfg"};

    const DOW = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];

    var sleeping = false;
    var font = null;
    var mid = null;
    var k = 1.0;
    var slots = new [10];
    // Layout: 0 = A Ruhiges Raster, 1 = C Werte am Rand
    var layout = 0;
    // Farbmodus: 0 Einfarbig, 1 Bedeutung (Farbe aus der Familie des Werts), 2 Nacht (alles gedimmt)
    var cmode = 0;
    var nightAuto = false;
    var night = false;
    var gaugeL = 1;
    var gaugeR = 2;
    var locMinute = -1;
    var loc = null;
    // Zwischenbild für die schräg gestellten Randwerte (Layout C)
    var rimBmp = null;

    function initialize() {
        WatchFace.initialize();
        loadSettings();
    }

    function onLayout(dc) {
        font = WatchUi.loadResource(Rez.Fonts.Mono);
        mid = WatchUi.loadResource(Rez.Fonts.Mid);
        k = dc.getWidth() / 344.0;
    }

    function onEnterSleep() {
        sleeping = true;
        WatchUi.requestUpdate();
    }

    function onExitSleep() {
        sleeping = false;
        WatchUi.requestUpdate();
    }

    // Einstellungen aus Garmin Connect lesen (auch nach jeder Änderung)
    function loadSettings() {
        for (var i = 0; i < SLOT_KEYS.size(); i++) {
            slots[i] = prop(SLOT_KEYS[i], SLOT_DEFAULT[i]);
        }
        layout = prop("dlayout", 0) == 1 ? 1 : 0;
        cmode = prop("cmode", 0);
        var na = null;
        try {
            na = Application.Properties.getValue("nauto");
        } catch (e) {
            na = null;
        }
        nightAuto = (na == true);
        gaugeL = prop("g_l", 1);
        gaugeR = prop("g_r", 2);
        loc = null;
    }

    function prop(key, def) {
        var v = null;
        try {
            v = Application.Properties.getValue(key);
        } catch (e) {
            v = null;
        }
        return (v instanceof Number) ? v : def;
    }

    // ---------- Farben
    // Nacht: Farbe auf 55 % dimmen
    function C(c) {
        if (!night) {
            return c;
        }
        var r = (((c >> 16) & 0xFF) * 55) / 100;
        var g = (((c >> 8) & 0xFF) * 55) / 100;
        var b = ((c & 0xFF) * 55) / 100;
        return (r << 16) | (g << 8) | b;
    }

    // Farbe eines Werts: im Modus "Bedeutung" die Farbe seiner Familie, sonst die Farbe des Platzes
    function famCol(fam, def) {
        if (cmode == 1 && fam != null && fam > 0 && fam < Fields.FAMCOL.size()) {
            return C(Fields.FAMCOL[fam]);
        }
        return C(def);
    }

    function valueCol(t, def) {
        return famCol((t != null && t >= 0 && t < Fields.FAM.size()) ? Fields.FAM[t] : 0, def);
    }

    function ghostCol() {
        return night ? 0x17181B : GHOST;
    }

    function segOff() {
        return night ? 0x121316 : SEG_OFF;
    }

    function barOff() {
        return night ? 0x17181B : BAR_OFF;
    }

    function lineCol() {
        return night ? 0x1E1F22 : LINE;
    }

    // Schlafenszeit aus dem Garmin-Profil (für "Nacht automatisch")
    function inSleepTime(clock) {
        if (!(Toybox has :UserProfile)) {
            return false;
        }
        var p = UserProfile.getProfile();
        if (p == null || p.sleepTime == null || p.wakeTime == null) {
            return false;
        }
        var sl = p.sleepTime.value();
        var wk = p.wakeTime.value();
        var now = clock.hour * 3600 + clock.min * 60;
        if (sl > wk) {
            return now >= sl || now < wk;
        }
        return now >= sl && now < wk;
    }

    function S(v) {
        return (v * k + 0.5).toNumber();
    }

    function onUpdate(dc) {
        var w = dc.getWidth();
        var cx = w / 2;
        var clock = System.getClockTime();
        var settings = System.getDeviceSettings();
        dc.setColor(BG, BG);
        dc.clear();
        night = (cmode == 2) || (nightAuto && inSleepTime(clock));

        // Immer an (AMOLED): nur die Uhrzeit, dünn und gedimmt
        if (sleeping && (settings has :requiresBurnInProtection) && settings.requiresBurnInProtection) {
            drawAod(dc, clock, settings);
            return;
        }

        var hc = Application.Storage.getValue("today");
        if (!(hc instanceof Dictionary)) {
            hc = null;
        }
        var now = Time.now();
        var cond = null;
        if (Toybox has :Weather) {
            cond = Weather.getCurrentConditions();
        }
        var ctx = {
            :cond => cond,
            :am => ActivityMonitor.getInfo(),
            :ai => Activity.getActivityInfo(),
            :settings => settings,
            :now => now
        };
        // Standort für Sonnenzeiten höchstens einmal pro Minute bestimmen
        if (locMinute != clock.min || loc == null) {
            loc = Fields.location(ctx);
            locMinute = clock.min;
        }
        ctx[:loc] = loc;

        var t = hhmm(clock.hour, clock.min, settings.is24Hour);
        var noKey = hc == null && !hasToken();
        if (layout == 1) {
            drawC(dc, w, cx, hc, ctx, now, t, noKey);
        } else {
            drawA(dc, w, cx, hc, ctx, now, t, clock, noKey);
        }
    }

    // ---------- Layout A: Ruhiges Raster
    // Datum · Sonnenzeiten mit Wetter · Uhrzeit mit Sekunden · drei Werte · drei Werte, Strich-Anzeigen links und rechts
    function drawA(dc, w, cx, hc, ctx, now, t, clock, noKey) {
        hline(dc, w, 62, 40);
        hline(dc, w, 104, 16);
        hline(dc, w, 204, 16);
        hline(dc, w, 248, 36);

        drawDate(dc, cx, S(46), now, hc);

        // Oben: Sonnenaufgang · Temperatur · Sonnenuntergang (Sonnenzeiten gedämpft wie im Konzept)
        drawGroupCentered(dc, [cell(0, hc, ctx, MUTED), cell(1, hc, ctx, BRIGHT), cell(2, hc, ctx, MUTED)], cx, S(85), S(16), font, S(17));

        drawDigits(dc, t, cx, S(118), S(56), S(52), S(9), S(11), C(TIME_ON), segOff());
        drawDigits(dc, clock.sec.format("%02d"), cx, S(180), S(14), S(14), S(3), S(4), C(SEC), segOff());

        // Mitte: Puls · Tagesziel · Schritte, größer und hell
        drawGroupCentered(dc, [cell(3, hc, ctx, BRIGHT), cell(4, hc, ctx, BRIGHT), cell(5, hc, ctx, BRIGHT)], cx, S(226), S(16), mid, S(18));

        // Unten: Body Battery · nächste Einheit · Hübe
        if (noKey) {
            noKeyText(dc, cx, S(271));
        } else {
            drawGroupCentered(dc, [cell(6, hc, ctx, BRIGHT), cell(7, hc, ctx, BRIGHT), cell(8, hc, ctx, BRIGHT)], cx, S(271), S(16), font, S(17));
        }

        // Strich-Anzeigen: je 10 Striche, von unten gefüllt
        drawGauge(dc, S(10), S(132), Fields.gauge(gaugeL, hc, ctx), famCol(gfam(gaugeL), BAR_ON));
        drawGauge(dc, w - S(10) - S(16), S(132), Fields.gauge(gaugeR, hc, ctx), famCol(gfam(gaugeR), BAR_ON));
    }

    // ---------- Layout C: Werte am Rand
    // Vier Werte stehen schräg am Rand (oben 1 und 3, unten 1 und 3), die Mitte bleibt luftig
    function drawC(dc, w, cx, hc, ctx, now, t, noKey) {
        hline(dc, w, 124, 30);
        hline(dc, w, 194, 30);

        drawDate(dc, cx, S(70), now, hc);
        // Oben: Mitte-Feld und Zusatzfeld (Temperatur, Regen)
        drawGroupCentered(dc, [cell(1, hc, ctx, BRIGHT), cell(9, hc, ctx, BRIGHT)], cx, S(102), S(14), font, S(16));

        drawDigits(dc, t, cx, S(134), S(52), S(48), S(9), S(10), C(TIME_ON), segOff());

        drawGroupCentered(dc, [cell(3, hc, ctx, BRIGHT), cell(4, hc, ctx, BRIGHT), cell(5, hc, ctx, BRIGHT)], cx, S(216), S(14), mid, S(17));
        if (noKey) {
            noKeyText(dc, cx, S(251));
        } else {
            drawCentered(dc, cell(7, hc, ctx, BRIGHT), cx, S(251), font, S(17));
        }

        // Rand: Sonnenzeiten oben (gedämpft), Body Battery und Hübe unten
        drawRim(dc, cell(0, hc, ctx, MUTED), S(66), S(84), -48);
        drawRim(dc, cell(2, hc, ctx, MUTED), w - S(66), S(84), 48);
        drawRim(dc, cell(6, hc, ctx, BRIGHT), S(70), S(262), 48);
        drawRim(dc, cell(8, hc, ctx, BRIGHT), w - S(70), S(262), -48);
    }

    // Datum "DO 26.11" mit Geisterziffern, Kreuz bei Krankmeldung links daneben
    function drawDate(dc, cx, cy, now, hc) {
        var d = Gregorian.info(now, Time.FORMAT_SHORT);
        var text = DOW[(d.day_of_week - 1) % 7] + " " + d.day.format("%02d") + "." + d.month.format("%02d");
        drawGhostText(dc, cx, cy, "   88.88", text, C(BRIGHT), Graphics.TEXT_JUSTIFY_CENTER);
        if (hc != null && hc["sick"] == true) {
            var s = S(15);
            Icons.draw(dc, "cross", cx - dc.getTextWidthInPixels(text, font) / 2 - S(8) - s, cy - s / 2, s, C(TIME_ON));
        }
    }

    function hasToken() {
        var tok = Application.Properties.getValue("token");
        return tok != null && (tok instanceof String) && tok.length() >= 10;
    }

    function noKeyText(dc, cx, cy) {
        dc.setColor(C(BRIGHT), Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy, font, "KEIN SCHLÜSSEL", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // Waagerechte Trennlinie, spiegelgleich auf ganze Pixel
    function hline(dc, w, y, inset) {
        dc.setColor(lineCol(), Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(S(inset), S(y), w - 2 * S(inset), 1);
    }

    // Wert schräg am Rand: erst in ein Zwischenbild zeichnen, dann gedreht aufs Zifferblatt.
    // Ohne Drehfunktion (ältere Geräte) steht der Wert gerade an derselben Stelle.
    function drawRim(dc, c, mx, my, deg) {
        if (c == null) {
            return;
        }
        var isz = S(16);
        if (!(dc has :drawBitmap2) || !(Graphics has :createBufferedBitmap) || !(Graphics has :AffineTransform)) {
            drawCentered(dc, c, mx, my, font, isz);
            return;
        }
        var bw = S(150);
        var bh = S(30);
        if (rimBmp == null) {
            var ref = Graphics.createBufferedBitmap({:width => bw, :height => bh});
            rimBmp = (ref != null) ? ref.get() : null;
            if (rimBmp == null) {
                drawCentered(dc, c, mx, my, font, isz);
                return;
            }
        }
        var bdc = rimBmp.getDc();
        bdc.setColor(BG, BG);
        bdc.clear();
        var cw = cellWidth(bdc, c, font, isz);
        drawCell(bdc, c, (bw - cw) / 2, bh / 2, font, isz);
        var xf = new Graphics.AffineTransform();
        xf.translate(mx.toFloat(), my.toFloat());
        xf.rotate(Math.toRadians(deg));
        xf.translate(-bw / 2.0, -bh / 2.0);
        dc.drawBitmap2(0, 0, rimBmp, {:transform => xf, :filterMode => Graphics.FILTER_MODE_BILINEAR});
    }

    // Immer an: Uhrzeit groß mit dünnem Strich (höchstens etwa 7 % der Pixel, Garmin erlaubt rund 10 %),
    // wandert jede Minute ein paar Pixel gegen Einbrennen
    function drawAod(dc, clock, settings) {
        var w = dc.getWidth();
        var cx = w / 2;
        var u = w / 454.0;
        var dx = ((clock.min % 5) - 2) * 6;
        var dy = (((clock.min / 5) % 5) - 2) * 6;
        var t = hhmm(clock.hour, clock.min, settings.is24Hour);
        var th = (4 * u + 0.5).toNumber();
        th = th < 2 ? 2 : th;
        drawDigits(dc, t, cx + dx, (170 * u + 0.5).toNumber() + dy, (80 * u + 0.5).toNumber(), (106 * u + 0.5).toNumber(), th, (14 * u + 0.5).toNumber(), Graphics.COLOR_DK_GRAY, BG);
    }

    // Feld = [Icon, Geisterziffern, Wert, Farbe] oder null bei "Leer"
    function cell(i, hc, ctx, color) {
        var t = slots[i];
        if (t == null || t <= 0 || t >= Fields.ICON.size() || t == 31) { // 31: frühere Hauttemperatur, gilt als leer
            return null;
        }
        return [Fields.ICON[t], Fields.GHOST[t], Fields.value(t, hc, ctx), valueCol(t, color)];
    }

    function gfam(g) {
        return (g != null && g >= 0 && g < Fields.GFAM.size()) ? Fields.GFAM[g] : 0;
    }

    function cellWidth(dc, c, f, isz) {
        if (c == null) {
            return 0;
        }
        var tw = dc.getTextWidthInPixels(c[1], f);
        var vw = dc.getTextWidthInPixels(c[2], f);
        return Icons.width(c[0], isz) + S(5) + (vw > tw ? vw : tw);
    }

    // Icon links, dahinter Geisterziffern und Wert, beide rechtsbündig wie bei einer LCD-Anzeige
    function drawCell(dc, c, left, cy, f, isz) {
        if (c == null) {
            return;
        }
        Icons.draw(dc, c[0], left, cy - isz / 2, isz, c[3]);
        var right = left + cellWidth(dc, c, f, isz);
        dc.setColor(ghostCol(), Graphics.COLOR_TRANSPARENT);
        dc.drawText(right, cy, f, c[1], Graphics.TEXT_JUSTIFY_RIGHT | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(c[3], Graphics.COLOR_TRANSPARENT);
        dc.drawText(right, cy, f, c[2], Graphics.TEXT_JUSTIFY_RIGHT | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function drawCentered(dc, c, mx, cy, f, isz) {
        if (c != null) {
            drawCell(dc, c, mx - cellWidth(dc, c, f, isz) / 2, cy, f, isz);
        }
    }

    function groupWidth(dc, g, gap, f, isz) {
        var total = 0;
        var n = 0;
        for (var i = 0; i < g.size(); i++) {
            if (g[i] != null) {
                total += cellWidth(dc, g[i], f, isz);
                n++;
            }
        }
        return n > 1 ? total + gap * (n - 1) : total;
    }

    function drawGroupCentered(dc, g, mx, cy, gap, f, isz) {
        var x = mx - groupWidth(dc, g, gap, f, isz) / 2;
        for (var i = 0; i < g.size(); i++) {
            if (g[i] != null) {
                drawCell(dc, g[i], x, cy, f, isz);
                x += cellWidth(dc, g[i], f, isz) + gap;
            }
        }
    }

    // Text mit Geisterziffern dahinter
    function drawGhostText(dc, x, cy, ghost, text, color, just) {
        dc.setColor(ghostCol(), Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, cy, font, ghost, just | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, cy, font, text, just | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // Ziffernfolge in 7-Segment-Optik, mittig um mx; Doppelpunkt aus zwei Quadraten
    function drawDigits(dc, text, mx, top, dw, dh, t, gap, on, off) {
        // Gerade Strichstärke und Höhe, damit der Mittelbalken genau mittig sitzt (ganze Pixel)
        t = (t / 2) * 2;
        if (t < 2) {
            t = 2;
        }
        dh = (dh / 2) * 2;
        var chars = text.toCharArray();
        var total = 0;
        for (var i = 0; i < chars.size(); i++) {
            total += (chars[i] == ':' ? t : dw);
        }
        total += gap * (chars.size() - 1);
        var x = mx - total / 2;
        x = x.toNumber();
        for (var i = 0; i < chars.size(); i++) {
            if (chars[i] == ':') {
                dc.setColor(on, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(x, top + (dh * 0.26).toNumber(), t, t);
                dc.fillRectangle(x, top + (dh * 0.66).toNumber(), t, t);
                x += t + gap;
            } else {
                drawDigit(dc, chars[i], x, top, dw, dh, t, on, off);
                x += dw + gap;
            }
        }
    }

    function drawDigit(dc, ch, x, y, w, h, t, on, off) {
        var lit = SEGS[ch];
        if (lit == null) {
            lit = "";
        }
        var hv = h / 2;
        var ht = t / 2;
        // Erst alle Balken dunkel (Geister-Segmente), dann die leuchtenden
        for (var pass = 0; pass < 2; pass++) {
            var segs = "abcdefg".toCharArray();
            for (var i = 0; i < segs.size(); i++) {
                var isOn = lit.find(segs[i].toString()) != null;
                if ((pass == 0 && isOn) || (pass == 1 && !isOn)) {
                    continue;
                }
                dc.setColor(isOn ? on : off, Graphics.COLOR_TRANSPARENT);
                var sg = segs[i];
                if (sg == 'a') {
                    dc.fillRectangle(x, y, w, t);
                } else if (sg == 'b') {
                    dc.fillRectangle(x + w - t, y, t, hv + ht);
                } else if (sg == 'c') {
                    dc.fillRectangle(x + w - t, y + hv - ht, t, h - hv + ht);
                } else if (sg == 'd') {
                    dc.fillRectangle(x, y + h - t, w, t);
                } else if (sg == 'e') {
                    dc.fillRectangle(x, y + hv - ht, t, h - hv + ht);
                } else if (sg == 'f') {
                    dc.fillRectangle(x, y, t, hv + ht);
                } else if (sg == 'g') {
                    dc.fillRectangle(x, y + hv - ht, w, t);
                }
            }
        }
    }

    // 10 Striche von unten nach oben gefüllt; ohne Daten alle dunkel
    function drawGauge(dc, x, top, v, on) {
        var n = 10;
        var lit = 0;
        if (v != null) {
            lit = (v * n + 0.5).toNumber();
            lit = lit < 0 ? 0 : (lit > n ? n : lit);
        }
        var bh = S(2) < 2 ? 2 : S(2);
        var step = bh + S(3);
        for (var i = 0; i < n; i++) {
            dc.setColor(i < lit ? on : barOff(), Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(x, top + (n - 1 - i) * step, S(16), bh);
        }
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
}
