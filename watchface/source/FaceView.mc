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

    const SLOT_KEYS = ["s_a1", "s_a2", "s_b1", "s_b2", "s_b3", "s_b4", "s_c1", "s_c2", "s_c3", "s_c4", "s_d1", "s_d2", "s_e1", "s_e2"];
    const SLOT_DEFAULT = [1, 2, 3, 5, 6, 4, 7, 8, 9, 10, 11, 12, 13, 14];

    // 7-Segment: welche Balken je Ziffer leuchten
    const SEGS = {'0' => "abcdef", '1' => "bc", '2' => "abged", '3' => "abgcd", '4' => "fgbc", '5' => "afgcd", '6' => "afgedc", '7' => "abc", '8' => "abcdefg", '9' => "abcdfg"};

    var sleeping = false;
    var font = null;
    var k = 1.0;
    var slots = new [14];
    // Farbmodus: 0 Einfarbig (wie die Vorlage), 1 Bedeutung (Farbe aus der Familie des Werts), 2 Nacht (alles gedimmt)
    var cmode = 0;
    var nightAuto = false;
    var night = false;
    var gaugeL = 1;
    var gaugeR = 2;
    // Layout: 0 Datenraster, 1 Monolith, 2 Zyklus-Spur, 3 Stapel, 4 Eine Zeile (Vorschläge 15, 17, 19, 20)
    var layout = 0;
    var lslots = [10, 1, 2];
    var big = null;
    var kk = 1.0;
    var locMinute = -1;
    var loc = null;

    function initialize() {
        WatchFace.initialize();
        loadSettings();
    }

    function onLayout(dc) {
        font = WatchUi.loadResource(Rez.Fonts.Mono);
        big = WatchUi.loadResource(Rez.Fonts.Big);
        k = dc.getWidth() / 344.0;
        kk = dc.getWidth() / 454.0;
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
        cmode = prop("cmode", 0);
        var na = null;
        try {
            na = Application.Properties.getValue("nauto");
        } catch (e) {
            na = null;
        }
        nightAuto = (na == true);
        layout = prop("layout", 0);
        lslots = [prop("s_l1", 10), prop("s_l2", 1), prop("s_l3", 2)];
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

    // Farbe eines Werts: im Modus "Bedeutung" die Farbe seiner Familie, sonst die Farbe des Platzes aus der Vorlage
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

        // Immer an (AMOLED): bei allen Layouts die Monolith-Uhrzeit, dünn und gedimmt (siehe drawMinimalAod)
        if (sleeping && (settings has :requiresBurnInProtection) && settings.requiresBurnInProtection) {
            drawMinimalAod(dc, clock, settings);
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

        if (layout > 0) {
            drawMinimal(dc, hc, ctx, clock, settings, now);
            return;
        }

        var ringCol = night ? 0x141517 : RING;
        var ring2Col = night ? 0x111214 : RING2;
        var bezelCol = C(BEZEL);

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
        // Auf ganze Pixel und spiegelgleich: Breite = Display minus beide Ränder, senkrechte Striche genau in der Mitte
        dc.setColor(lineCol(), Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(S(36), S(66), w - 2 * S(36), 1);
        dc.fillRectangle(cx, S(66), 1, S(100) - S(66));
        dc.fillRectangle(S(18), S(100), w - 2 * S(18), 1);
        dc.fillRectangle(S(18), S(248), w - 2 * S(18), 1);
        dc.fillRectangle(cx, S(248), 1, S(282) - S(248));
        dc.fillRectangle(S(36), S(282), w - 2 * S(36), 1);

        // Datum "22 11 2026", Kreuz bei Krankmeldung
        var d = Gregorian.info(now, Time.FORMAT_SHORT);
        var dateCol = C(BRIGHT);
        var dateText = d.day.format("%02d") + " " + d.month.format("%02d") + " " + d.year.format("%04d");
        drawGhostText(dc, cx, S(50), "88 88 8888", dateText, dateCol, Graphics.TEXT_JUSTIFY_CENTER);
        if (hc != null && hc["sick"] == true) {
            Icons.draw(dc, "cross", S(96), S(43), S(15), C(TIME_ON));
        }

        // Obere Zeile: zwei Felder links und rechts des Trennstrichs
        var topCol = BRIGHT;
        drawCentered(dc, cell(0, hc, ctx, topCol), cx - S(54), S(83));
        drawCentered(dc, cell(1, hc, ctx, topCol), cx + S(54), S(83));

        // Wetterzeile: links, Mitte (zwei Felder), rechts
        var wxOuter = MUTED;
        var wxInner = BRIGHT;
        drawSpread(dc, [[cell(2, hc, ctx, wxOuter)], [cell(3, hc, ctx, wxInner), cell(4, hc, ctx, wxInner)], [cell(5, hc, ctx, wxOuter)]], S(28), w - S(28), S(117));

        // Uhrzeit in 7-Segment-Ziffern, darunter kleine Sekunden
        var timeCol = C(TIME_ON);
        drawTime(dc, hhmm(clock.hour, clock.min, settings.is24Hour), cx, S(146), timeCol, segOff());
        drawDigits(dc, clock.sec.format("%02d"), cx, S(206), S(13), S(12), S(3), S(4), C(SEC), segOff());

        // Zeile unter der Uhrzeit: vier Felder über die ganze Breite
        var midCol = MUTED;
        drawSpread(dc, [[cell(6, hc, ctx, midCol)], [cell(7, hc, ctx, midCol)], [cell(8, hc, ctx, midCol)], [cell(9, hc, ctx, midCol)]], S(28), w - S(28), S(236));

        // Untere Zeile: zwei Felder links und rechts des Trennstrichs
        var lowCol = BRIGHT;
        drawCentered(dc, cell(10, hc, ctx, lowCol), cx - S(54), S(265));
        drawCentered(dc, cell(11, hc, ctx, lowCol), cx + S(54), S(265));

        // Ganz unten: zwei Felder mittig
        var botCol = BRIGHT;
        var tok = Application.Properties.getValue("token");
        if (hc == null && (tok == null || !(tok instanceof String) || tok.length() < 10)) {
            dc.setColor(C(botCol), Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, S(299), font, "KEIN SCHLÜSSEL", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        } else {
            drawGroupCentered(dc, [cell(12, hc, ctx, botCol), cell(13, hc, ctx, botCol)], cx, S(299), S(16));
        }

        // Strich-Anzeigen: links und rechts je 10 Striche (von unten), in den Ecken je 5 kleine Striche
        var cornerOn = C(CORNER_ON);
        drawGauge(dc, S(10), S(148), Fields.gauge(gaugeL, hc, ctx), famCol(gfam(gaugeL), BAR_ON));
        drawGauge(dc, w - S(10) - S(16), S(148), Fields.gauge(gaugeR, hc, ctx), famCol(gfam(gaugeR), BAR_ON));
        drawStack(dc, S(42), S(72), 3, cornerOn);
        drawStack(dc, w - S(42) - S(12), S(72), 5, cornerOn);
        drawStack(dc, S(38), S(254), 2, cornerOn);
        drawStack(dc, w - S(38) - S(12), S(254), 4, cornerOn);
    }

    // ---------- Schlichte Layouts (Konzept docs/entwurf-zifferblatt.html, Maße im 454-px-Raster)

    function T(v) {
        return (v * kk + 0.5).toNumber();
    }

    const DOW = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];

    function dateShort(now) {
        var d = Gregorian.info(now, Time.FORMAT_SHORT);
        return DOW[(d.day_of_week - 1) % 7] + " " + d.day.format("%02d") + " " + d.month.format("%02d");
    }

    function lcell(i, hc, ctx, color) {
        var t = lslots[i];
        if (t == null || t <= 0 || t >= Fields.ICON.size()) {
            return null;
        }
        return [Fields.ICON[t], Fields.GHOST[t], Fields.value(t, hc, ctx), valueCol(t, color)];
    }

    function phaseWord(p) {
        if (p == null || !(p instanceof String)) {
            return null;
        }
        if (p.equals("MENS")) { return "PERIODE"; }
        if (p.equals("FOLL")) { return "FOLLIKEL"; }
        if (p.equals("EISP")) { return "EISPRUNG"; }
        return "LUTEAL";
    }

    function drawMinimal(dc, hc, ctx, clock, settings, now) {
        var w = dc.getWidth();
        var cx = w / 2;
        var timeCol = C(TIME_ON);
        var dateCol = C(MUTED);
        var fieldCol = BRIGHT;
        var lc = lineCol();
        var t = hhmm(clock.hour, clock.min, settings.is24Hour);
        var vc = Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER;

        if (layout == 1) {
            // 15 Monolith: Datum, große Segmentuhr, ein Feld
            dc.setColor(dateCol, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, T(124), font, dateShort(now), vc);
            drawDigits(dc, t, cx, T(170), T(80), T(106), T(13), T(14), timeCol, segOff());
            drawCentered(dc, lcell(0, hc, ctx, fieldCol), cx, T(322));
        } else if (layout == 2) {
            // 17 Zyklus-Spur: Punkte für die Zyklustage, Uhrzeit, Zyklustag und Phase, zwei Felder
            drawCycleDots(dc, hc, false);
            dc.setColor(timeCol, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, T(192), big, t, vc);
            var cd = (hc != null) ? hc["cycleDay"] : null;
            var line = "ZYKLUS --";
            if (cd != null) {
                line = "ZT " + cd.toString();
                var pw = phaseWord(hc["phase"]);
                if (pw != null) {
                    line += " · " + pw;
                }
            }
            dc.setColor(famCol(4, BRIGHT), Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, T(282), font, line, vc);
            var c1 = lcell(0, hc, ctx, MUTED);
            var c2 = lcell(1, hc, ctx, MUTED);
            if (c1 != null) {
                drawCell(dc, c1, cx - T(18) - cellWidth(dc, c1), T(332));
            }
            if (c2 != null) {
                drawCell(dc, c2, cx + T(18), T(332));
            }
            if (c1 != null && c2 != null) {
                dc.setColor(lc, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(cx, T(318), 1, T(28));
            }
        } else if (layout == 3) {
            // 19 Stapel: Stunden über Minuten links, drei Felder rechts
            drawDigits(dc, t.substring(0, 2), T(136), T(92), T(66), T(120), T(12), T(16), timeCol, segOff());
            drawDigits(dc, t.substring(3, 5), T(136), T(242), T(66), T(120), T(12), T(16), timeCol, segOff());
            dc.setColor(lc, Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(T(238), T(110), 1, T(234));
            for (var i = 0; i < 3; i++) {
                drawCell(dc, lcell(i, hc, ctx, fieldCol), T(262), T(149 + 74 * i));
                if (i < 2) {
                    dc.setColor(lc, Graphics.COLOR_TRANSPARENT);
                    dc.fillRectangle(T(262), T(186 + 74 * i), T(138), 1);
                }
            }
        } else {
            // 20 Eine Zeile: Datum, Uhrzeit, drei Felder in einer Zeile
            dc.setColor(dateCol, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, T(117), font, dateShort(now), vc);
            dc.setColor(timeCol, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, T(210), big, t, vc);
            drawGroupCentered(dc, [lcell(0, hc, ctx, fieldCol), lcell(1, hc, ctx, fieldCol), lcell(2, hc, ctx, fieldCol)], cx, T(311), T(26));
        }
    }

    // Punkte am Rand: ein Punkt je Zyklustag, Periodentage (1–5) heller, heute groß
    function drawCycleDots(dc, hc, aodOnly) {
        var w = dc.getWidth();
        var cx = w / 2;
        var n = 28;
        var today = null;
        if (hc != null) {
            if (hc["cycleLen"] instanceof Number) {
                n = hc["cycleLen"];
            }
            today = hc["cycleDay"];
        }
        n = n < 20 ? 20 : (n > 45 ? 45 : n);
        var r = T(205);
        aa(dc, true);
        for (var i = 0; i < n; i++) {
            var isToday = today != null && (i + 1 == (today > n ? n : today));
            if (aodOnly && !isToday) {
                continue;
            }
            var a = (i.toFloat() / n) * 2 * Math.PI - Math.PI / 2;
            var x = cx + r * Math.cos(a);
            var y = cx + r * Math.sin(a);
            if (isToday) {
                dc.setColor(aodOnly ? Graphics.COLOR_DK_GRAY : famCol(4, TIME_ON), Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, y, T(9));
            } else {
                // Periodentage: im Modus "Bedeutung" Menstruation (Rosé), sonst gedämpftes Grau
                dc.setColor(i < 5 ? (cmode == 1 ? C(0xF28B8B) : C(MUTED)) : (night ? 0x1E1F22 : 0x34373D), Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, y, T(5));
            }
        }
        aa(dc, false);
    }

    // Immer an: Uhrzeit wie Monolith (gleiche Größe), aber mit dünnem Strich, damit höchstens etwa 7 % der Pixel leuchten
    // (Garmin erlaubt auf AMOLED im Modus "Immer an" rund 10 %). Wandert jede Minute ein paar Pixel gegen Einbrennen.
    // Zyklus-Spur zeigt zusätzlich den Punkt für heute.
    function drawMinimalAod(dc, clock, settings) {
        var w = dc.getWidth();
        var cx = w / 2;
        var dx = ((clock.min % 5) - 2) * 6;
        var dy = (((clock.min / 5) % 5) - 2) * 6;
        var t = hhmm(clock.hour, clock.min, settings.is24Hour);
        if (layout == 2) {
            var hc = Application.Storage.getValue("today");
            drawCycleDots(dc, (hc instanceof Dictionary) ? hc : null, true);
        }
        var th = T(4) < 2 ? 2 : T(4);
        drawDigits(dc, t, cx + dx, T(170) + dy, T(80), T(106), th, T(14), Graphics.COLOR_DK_GRAY, BG);
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
        return [Fields.ICON[t], Fields.GHOST[t], Fields.value(t, hc, ctx), valueCol(t, color)];
    }

    function gfam(g) {
        return (g != null && g >= 0 && g < Fields.GFAM.size()) ? Fields.GFAM[g] : 0;
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
        dc.setColor(ghostCol(), Graphics.COLOR_TRANSPARENT);
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
        dc.setColor(ghostCol(), Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, cy, font, ghost, just | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, cy, font, text, just | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    function drawTime(dc, text, mx, top, on, off) {
        drawDigits(dc, text, mx, top, S(50), S(44), S(8), S(10), on, off);
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

    // 5 kleine Striche, von oben gefüllt (Schmuck wie im Konzept)
    function drawStack(dc, x, top, lit, on) {
        var bh = S(2) < 2 ? 2 : S(2);
        var step = bh + S(3);
        for (var i = 0; i < 5; i++) {
            dc.setColor(i < lit ? on : barOff(), Graphics.COLOR_TRANSPARENT);
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
