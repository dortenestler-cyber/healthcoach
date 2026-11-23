import Toybox.ActivityMonitor;
import Toybox.Activity;
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Weather;
import Toybox.WatchUi;

// Zifferblatt "Datenraster" genau nach dem Klick-Dummy (Screen "Zifferblatt").
// Alle Maße stammen aus dem Konzept mit 344 px Durchmesser und werden auf das Display skaliert.
// Felder und Farben stellt die Nutzerin in Garmin Connect ein (settings.xml).
class FaceView extends WatchUi.WatchFace {

    // Farben aus dem Konzept
    const BG = 0x000000;
    const GHOST = 0x2A2B2F;
    const LINE = 0x2C2D31;
    const RING = 0x25262A;
    const RING2 = 0x1F2023;
    const BRIGHT = 0xCFD0CB;
    const MUTED = 0x7E8085;
    const TIME_ON = 0xE4E5DF;
    const SEG_OFF = 0x202125;
    const SEC = 0x9C9EA3;
    const BEZEL = 0xF2F2EE;
    const BAR_ON = 0xE4E5DF;
    const CORNER_ON = 0x9C9EA3;
    const BAR_OFF = 0x2A2B2F;

    // Auswahl in Garmin Connect: 0 = Standard, danach Weiß, Grau, Beere, Sage, Terracotta, Slate-Blau, Amber, Violett
    // (aufgehellte App-Farben, damit sie auf Schwarz lesbar sind)
    const PALETTE = [-1, 0xE4E5DF, 0x7E8085, 0xE0517F, 0x6FBF8F, 0xE8784A, 0x7C9BE0, 0xF0A13A, 0xA98BE0];

    const SLOT_KEYS = ["s_a1", "s_a2", "s_b1", "s_b2", "s_b3", "s_b4", "s_c1", "s_c2", "s_c3", "s_c4", "s_d1", "s_d2", "s_e1", "s_e2"];
    const SLOT_DEFAULT = [1, 2, 3, 5, 6, 4, 7, 8, 9, 10, 11, 12, 13, 14];
    const COLOR_KEYS = ["c_date", "c_top", "c_wx", "c_time", "c_mid", "c_low", "c_bot", "c_bars", "c_lines"];

    // 7-Segment: welche Balken je Ziffer leuchten
    const SEGS = {'0' => "abcdef", '1' => "bc", '2' => "abged", '3' => "abgcd", '4' => "fgbc", '5' => "afgcd", '6' => "afgedc", '7' => "abc", '8' => "abcdefg", '9' => "abcdfg"};

    var sleeping = false;
    var font = null;
    var k = 1.0;
    var slots = new [14];
    var colors = new [9];
    var gaugeL = 1;
    var gaugeR = 2;
    var locMinute = -1;
    var loc = null;

    function initialize() {
        WatchFace.initialize();
        loadSettings();
    }

    function onLayout(dc) {
        font = WatchUi.loadResource(Rez.Fonts.Mono);
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
        for (var i = 0; i < COLOR_KEYS.size(); i++) {
            colors[i] = prop(COLOR_KEYS[i], 0);
        }
        gaugeL = prop("g_l", 1);
        gaugeR = prop("g_r", 2);
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

    // Farbe eines Bereichs: gewählte Farbe oder Standard aus dem Konzept
    function col(area, def) {
        var c = colors[area];
        return (c != null && c > 0 && c < PALETTE.size()) ? PALETTE[c] : def;
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

        // Ruhemodus bei AMOLED: nur gedimmte Uhrzeit, die jede Minute etwas wandert (Schutz vor Einbrennen)
        if (sleeping && (settings has :requiresBurnInProtection) && settings.requiresBurnInProtection) {
            var dx = ((clock.min % 5) - 2) * 6;
            var dy = (((clock.min / 5) % 5) - 2) * 6;
            drawTime(dc, hhmm(clock.hour, clock.min, settings.is24Hour), cx + dx, S(146) + dy, Graphics.COLOR_DK_GRAY, BG);
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

        var lineCol = colors[8] == 1 ? BRIGHT : LINE;
        var ringCol = colors[8] == 1 ? MUTED : RING;
        var ring2Col = colors[8] == 1 ? GHOST : RING2;
        var bezelCol = BEZEL;

        // Rahmen: Markierungen am Rand, Kreise
        aa(dc, true);
        dc.setColor(bezelCol, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(cx - S(1.5), S(2), S(3), S(14));
        rotRect(dc, S(23), S(105.5), S(14), S(3), -20);
        rotRect(dc, w - S(23), S(105.5), S(14), S(3), 20);
        rotRect(dc, S(21), S(237.5), S(14), S(3), 20);
        rotRect(dc, w - S(21), S(237.5), S(14), S(3), -20);
        dc.setPenWidth(1);
        dc.setColor(ringCol, Graphics.COLOR_TRANSPARENT);
        dc.drawCircle(cx, S(170), S(68));
        dc.setColor(ring2Col, Graphics.COLOR_TRANSPARENT);
        dc.drawCircle(cx, S(84), S(24));
        aa(dc, false);

        // Trennlinien
        dc.setColor(lineCol, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(S(36), S(66), S(272), 1);
        dc.fillRectangle(S(171), S(66), 1, S(34));
        dc.fillRectangle(S(18), S(100), S(308), 1);
        dc.fillRectangle(S(18), S(248), S(308), 1);
        dc.fillRectangle(S(171), S(248), 1, S(34));
        dc.fillRectangle(S(36), S(282), S(272), 1);

        // Datum "22 11 2026", Kreuz bei Krankmeldung
        var d = Gregorian.info(now, Time.FORMAT_SHORT);
        var dateCol = col(0, BRIGHT);
        var dateText = d.day.format("%02d") + " " + d.month.format("%02d") + " " + d.year.format("%04d");
        drawGhostText(dc, cx, S(50), "88 88 8888", dateText, dateCol, Graphics.TEXT_JUSTIFY_CENTER);
        if (hc != null && hc["sick"] == true) {
            Icons.draw(dc, "cross", S(96), S(43), S(15), col(0, TIME_ON));
        }

        // Obere Zeile: zwei Felder links und rechts des Trennstrichs
        var topCol = col(1, BRIGHT);
        drawCentered(dc, cell(0, hc, ctx, topCol), S(118), S(83));
        drawCentered(dc, cell(1, hc, ctx, topCol), S(226), S(83));

        // Wetterzeile: links, Mitte (zwei Felder), rechts
        var wxOuter = col(2, MUTED);
        var wxInner = col(2, BRIGHT);
        drawSpread(dc, [[cell(2, hc, ctx, wxOuter)], [cell(3, hc, ctx, wxInner), cell(4, hc, ctx, wxInner)], [cell(5, hc, ctx, wxOuter)]], S(28), S(316), S(117));

        // Uhrzeit in 7-Segment-Ziffern, darunter kleine Sekunden
        var timeCol = col(3, TIME_ON);
        drawTime(dc, hhmm(clock.hour, clock.min, settings.is24Hour), cx, S(146), timeCol, SEG_OFF);
        drawDigits(dc, clock.sec.format("%02d"), cx, S(206), S(13), S(12), S(3), S(4), col(3, SEC), SEG_OFF);

        // Zeile unter der Uhrzeit: vier Felder über die ganze Breite
        var midCol = col(4, MUTED);
        drawSpread(dc, [[cell(6, hc, ctx, midCol)], [cell(7, hc, ctx, midCol)], [cell(8, hc, ctx, midCol)], [cell(9, hc, ctx, midCol)]], S(28), S(316), S(236));

        // Untere Zeile: zwei Felder links und rechts des Trennstrichs
        var lowCol = col(5, BRIGHT);
        drawCentered(dc, cell(10, hc, ctx, lowCol), S(118), S(265));
        drawCentered(dc, cell(11, hc, ctx, lowCol), S(226), S(265));

        // Ganz unten: zwei Felder mittig
        var botCol = col(6, BRIGHT);
        var tok = Application.Properties.getValue("token");
        if (hc == null && (tok == null || !(tok instanceof String) || tok.length() < 10)) {
            dc.setColor(botCol, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, S(299), font, "KEIN SCHLÜSSEL", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        } else {
            drawGroupCentered(dc, [cell(12, hc, ctx, botCol), cell(13, hc, ctx, botCol)], cx, S(299), S(16));
        }

        // Strich-Anzeigen: links und rechts je 10 Striche (von unten), in den Ecken je 5 kleine Striche
        var barOn = col(7, BAR_ON);
        var cornerOn = col(7, CORNER_ON);
        drawGauge(dc, S(10), S(148), Fields.gauge(gaugeL, hc, ctx), barOn);
        drawGauge(dc, w - S(10) - S(16), S(148), Fields.gauge(gaugeR, hc, ctx), barOn);
        drawStack(dc, S(42), S(72), 3, cornerOn);
        drawStack(dc, w - S(42) - S(12), S(72), 5, cornerOn);
        drawStack(dc, S(38), S(254), 2, cornerOn);
        drawStack(dc, w - S(38) - S(12), S(254), 4, cornerOn);
    }

    function aa(dc, on) {
        if (dc has :setAntiAlias) {
            dc.setAntiAlias(on);
        }
    }

    // Gedrehtes Rechteck um seinen Mittelpunkt
    function rotRect(dc, mx, my, w, h, deg) {
        var a = Math.toRadians(deg);
        var c = Math.cos(a);
        var s = Math.sin(a);
        var hw = w / 2.0;
        var hh = h / 2.0;
        var pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
        var out = new [4];
        for (var i = 0; i < 4; i++) {
            out[i] = [mx + pts[i][0] * c - pts[i][1] * s, my + pts[i][0] * s + pts[i][1] * c];
        }
        dc.fillPolygon(out);
    }

    // Feld = [Icon, Geisterziffern, Wert, Farbe] oder null bei "Leer"
    function cell(i, hc, ctx, color) {
        var t = slots[i];
        if (t == null || t <= 0 || t >= Fields.ICON.size() || t == 31) { // 31: frühere Hauttemperatur, gilt als leer
            return null;
        }
        return [Fields.ICON[t], Fields.GHOST[t], Fields.value(t, hc, ctx), color];
    }

    function iconSize() {
        return S(15);
    }

    function cellWidth(dc, c) {
        if (c == null) {
            return 0;
        }
        var tw = dc.getTextWidthInPixels(c[1], font);
        var vw = dc.getTextWidthInPixels(c[2], font);
        return iconSize() + S(5) + (vw > tw ? vw : tw);
    }

    // Icon links, dahinter Geisterziffern und Wert, beide rechtsbündig wie bei einer LCD-Anzeige
    function drawCell(dc, c, left, cy) {
        if (c == null) {
            return;
        }
        var s = iconSize();
        Icons.draw(dc, c[0], left, cy - s / 2, s, c[3]);
        var right = left + cellWidth(dc, c);
        dc.setColor(GHOST, Graphics.COLOR_TRANSPARENT);
        dc.drawText(right, cy, font, c[1], Graphics.TEXT_JUSTIFY_RIGHT | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(c[3], Graphics.COLOR_TRANSPARENT);
        dc.drawText(right, cy, font, c[2], Graphics.TEXT_JUSTIFY_RIGHT | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function drawCentered(dc, c, mx, cy) {
        if (c != null) {
            drawCell(dc, c, mx - cellWidth(dc, c) / 2, cy);
        }
    }

    function groupWidth(dc, g, gap) {
        var total = 0;
        var n = 0;
        for (var i = 0; i < g.size(); i++) {
            if (g[i] != null) {
                total += cellWidth(dc, g[i]);
                n++;
            }
        }
        return n > 1 ? total + gap * (n - 1) : total;
    }

    function drawGroup(dc, g, left, cy, gap) {
        var x = left;
        for (var i = 0; i < g.size(); i++) {
            if (g[i] != null) {
                drawCell(dc, g[i], x, cy);
                x += cellWidth(dc, g[i]) + gap;
            }
        }
    }

    function drawGroupCentered(dc, g, mx, cy, gap) {
        drawGroup(dc, g, mx - groupWidth(dc, g, gap) / 2, cy, gap);
    }

    // Gruppen gleichmäßig zwischen x0 und x1 verteilen (wie "space-between" im Konzept)
    function drawSpread(dc, groups, x0, x1, cy) {
        var gap = S(8);
        var used = [];
        var total = 0;
        for (var i = 0; i < groups.size(); i++) {
            var gw = groupWidth(dc, groups[i], gap);
            if (gw > 0) {
                used.add(groups[i]);
                total += gw;
            }
        }
        if (used.size() == 0) {
            return;
        }
        if (used.size() == 1) {
            drawGroupCentered(dc, used[0], (x0 + x1) / 2, cy, gap);
            return;
        }
        var space = (x1 - x0 - total) / (used.size() - 1);
        var x = x0;
        for (var i = 0; i < used.size(); i++) {
            drawGroup(dc, used[i], x, cy, gap);
            x += groupWidth(dc, used[i], gap) + space;
        }
    }

    // Text mit Geisterziffern dahinter
    function drawGhostText(dc, x, cy, ghost, text, color, just) {
        dc.setColor(GHOST, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, cy, font, ghost, just | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, cy, font, text, just | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function drawTime(dc, text, mx, top, on, off) {
        drawDigits(dc, text, mx, top, S(50), S(44), S(8), S(10), on, off);
    }

    // Ziffernfolge in 7-Segment-Optik, mittig um mx; Doppelpunkt aus zwei Quadraten
    function drawDigits(dc, text, mx, top, dw, dh, t, gap, on, off) {
        var chars = text.toCharArray();
        var total = 0;
        for (var i = 0; i < chars.size(); i++) {
            total += (chars[i] == ':' ? t : dw);
        }
        total += gap * (chars.size() - 1);
        var x = mx - total / 2;
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
            dc.setColor(i < lit ? on : BAR_OFF, Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(x, top + (n - 1 - i) * step, S(16), bh);
        }
    }

    // 5 kleine Striche, von oben gefüllt (Schmuck wie im Konzept)
    function drawStack(dc, x, top, lit, on) {
        var bh = S(2) < 2 ? 2 : S(2);
        var step = bh + S(3);
        for (var i = 0; i < 5; i++) {
            dc.setColor(i < lit ? on : BAR_OFF, Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(x, top + i * step, S(12), bh);
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
