import Toybox.Graphics;
import Toybox.Lang;

// Kantige Icons wie im Klick-Dummy: 16er-Raster, gezeichnet aus Rechtecken und Vielecken.
// Aussparungen (Rahmen, Ringe) werden in Schwarz darübergemalt, weil der Hintergrund schwarz ist.
module Icons {

    var _x = 0;
    var _y = 0;
    var _u = 1.0;
    var _fg = 0xFFFFFF;

    // Rechteck auf ganze Pixel gerundet: Anfang und Ende getrennt runden, damit Kanten scharf bleiben
    function r(dc, a, b, w, h) {
        var x0 = (_x + a * _u + 0.5).toNumber();
        var y0 = (_y + b * _u + 0.5).toNumber();
        var x1 = (_x + (a + w) * _u + 0.5).toNumber();
        var y1 = (_y + (b + h) * _u + 0.5).toNumber();
        dc.fillRectangle(x0, y0, (x1 - x0) < 1 ? 1 : x1 - x0, (y1 - y0) < 1 ? 1 : y1 - y0);
    }

    function p(dc, pts) {
        var out = new [pts.size() / 2];
        for (var i = 0; i < out.size(); i++) {
            out[i] = [(_x + pts[i * 2] * _u + 0.5).toNumber(), (_y + pts[i * 2 + 1] * _u + 0.5).toNumber()];
        }
        dc.fillPolygon(out);
    }

    // Aussparung: in Hintergrundfarbe malen, danach wieder Vordergrund
    function holeR(dc, a, b, w, h) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
        r(dc, a, b, w, h);
        dc.setColor(_fg, Graphics.COLOR_TRANSPARENT);
    }

    function holeP(dc, pts) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
        p(dc, pts);
        dc.setColor(_fg, Graphics.COLOR_TRANSPARENT);
    }

    // Achteck-Ring (Zyklus, Uhr-Symbole)
    function octRing(dc) {
        p(dc, [5, 1, 11, 1, 15, 5, 15, 11, 11, 15, 5, 15, 1, 11, 1, 5]);
        holeP(dc, [5.6, 2.5, 10.4, 2.5, 13.5, 5.6, 13.5, 10.4, 10.4, 13.5, 5.6, 13.5, 2.5, 10.4, 2.5, 5.6]);
    }

    // Breite eines Icons in Pixeln: Sonnenzeiten sind 1,5-mal so breit (Pfeil neben der Sonne)
    function width(name, s) {
        if (name != null && (name.equals("su") || name.equals("sd"))) {
            return (s * 3) / 2;
        }
        return s;
    }

    function draw(dc, name, x, y, s, fg) {
        _x = x.toNumber();
        _y = y.toNumber();
        _u = s / 16.0;
        _fg = fg;
        dc.setColor(fg, Graphics.COLOR_TRANSPARENT);
        if (name == null) {
            return;
        } else if (name.equals("bb")) {
            // Batterie mit Blitz (Body Battery)
            r(dc, 1, 4, 12, 8);
            holeR(dc, 2.5, 5.5, 9, 5);
            r(dc, 13, 6, 2, 4);
            p(dc, [8, 5.5, 5.5, 8.5, 7.5, 8.5, 6.5, 10.5, 9.5, 7.5, 7.5, 7.5]);
        } else if (name.equals("batt")) {
            // Akku der Uhr
            r(dc, 1, 4, 12, 8);
            holeR(dc, 2.5, 5.5, 9, 5);
            r(dc, 13, 6, 2, 4);
            r(dc, 3.5, 6.5, 5, 3);
        } else if (name.equals("cy")) {
            // Zyklustag: Achteck mit Punkt
            octRing(dc);
            r(dc, 4.5, 9, 3, 3);
        } else if (name.equals("phase")) {
            // Zyklusphase: Achteck, halb gefüllt
            octRing(dc);
            r(dc, 8, 4, 4, 8);
        } else if (name.equals("su") || name.equals("sd")) {
            // Sonnenaufgang / -untergang: halbe Sonne mit Strahlen über dem Horizont, Pfeil daneben (24er-Breite)
            r(dc, 0, 14, 16, 1.5);
            p(dc, [3, 14, 3, 11.5, 5, 9.5, 11, 9.5, 13, 11.5, 13, 14]);
            r(dc, 1, 9, 2, 1.5);
            r(dc, 13, 9, 2, 1.5);
            r(dc, 7.25, 5, 1.5, 3);
            r(dc, 3, 6, 1.5, 1.5);
            r(dc, 11.5, 6, 1.5, 1.5);
            if (name.equals("su")) {
                p(dc, [20.5, 2, 24, 6.5, 21.5, 6.5, 21.5, 15.5, 19.5, 15.5, 19.5, 6.5, 17, 6.5]);
            } else {
                p(dc, [20.5, 15.5, 24, 11, 21.5, 11, 21.5, 2, 19.5, 2, 19.5, 11, 17, 11]);
            }
        } else if (name.equals("cl")) {
            // Wolke (Temperatur)
            p(dc, [1.5, 12.5, 1.5, 9.5, 3.5, 7.5, 5.5, 7.5, 7.5, 5, 11, 5, 13, 7, 13, 8.5, 14.5, 10, 14.5, 12.5]);
        } else if (name.equals("dr")) {
            // Tropfen (Regen)
            p(dc, [8, 1, 13, 8, 11, 14, 5, 14, 3, 8]);
        } else if (name.equals("spo2")) {
            // Tropfen mit Ring (Sauerstoff)
            p(dc, [8, 1, 13, 8, 11, 14, 5, 14, 3, 8]);
            holeP(dc, [8, 5, 10.5, 8.5, 9.5, 11.5, 6.5, 11.5, 5.5, 8.5]);
        } else if (name.equals("he")) {
            // Herz (Puls)
            p(dc, [2, 4, 4, 2, 6, 2, 8, 4, 10, 2, 12, 2, 14, 4, 14, 7.5, 8, 13.5, 2, 7.5]);
        } else if (name.equals("rhr")) {
            // Herz mit Ruhestrich (Ruhepuls)
            p(dc, [2, 4, 4, 2, 6, 2, 8, 4, 10, 2, 12, 2, 14, 4, 14, 7.5, 8, 13.5, 2, 7.5]);
            holeR(dc, 4, 6.5, 8, 1.5);
        } else if (name.equals("hrv")) {
            // Herz mit Zacke (HRV)
            p(dc, [2, 4, 4, 2, 6, 2, 8, 4, 10, 2, 12, 2, 14, 4, 14, 7.5, 8, 13.5, 2, 7.5]);
            holeP(dc, [3, 6.5, 5.5, 6.5, 7, 4, 9, 9, 10.5, 6.5, 13, 6.5, 13, 7.8, 11.2, 7.8, 9, 11.5, 7, 6.7, 6.2, 7.8, 3, 7.8]);
        } else if (name.equals("fl")) {
            // Flamme (Hitzewallungen)
            p(dc, [8, 1, 11, 5, 10, 7.5, 12, 6.5, 13, 10, 10.5, 14.5, 5.5, 14.5, 3, 10, 4, 6.5, 6, 8.5]);
        } else if (name.equals("kcal")) {
            // Flamme mit Kern (Kalorien)
            p(dc, [8, 1, 11, 5, 10, 7.5, 12, 6.5, 13, 10, 10.5, 14.5, 5.5, 14.5, 3, 10, 4, 6.5, 6, 8.5]);
            holeP(dc, [8, 8, 10, 11, 9, 13, 7, 13, 6, 11]);
        } else if (name.equals("st")) {
            // Fußabdrücke (Schritte)
            r(dc, 2.5, 2, 4, 6.5);
            r(dc, 3, 10, 3, 2.5);
            r(dc, 9.5, 4.5, 4, 6.5);
            r(dc, 10, 12.5, 3, 2.5);
        } else if (name.equals("ta")) {
            // Zielscheibe (Tagesziel)
            r(dc, 1, 1, 14, 14);
            holeR(dc, 2.5, 2.5, 11, 11);
            r(dc, 4.5, 4.5, 7, 7);
            holeR(dc, 6, 6, 4, 4);
            r(dc, 7.25, 7.25, 1.5, 1.5);
        } else if (name.equals("ready")) {
            // Kästchen mit Haken (Readiness)
            r(dc, 1, 1, 14, 14);
            holeR(dc, 2.5, 2.5, 11, 11);
            p(dc, [4, 8, 5.5, 6.5, 7.5, 8.5, 11, 4, 12.5, 5.5, 7.5, 11.5]);
        } else if (name.equals("be")) {
            // Glocke (Benachrichtigungen)
            p(dc, [4, 11, 4, 6, 6, 3, 10, 3, 12, 6, 12, 11, 13.5, 12.5, 2.5, 12.5]);
            r(dc, 6.5, 13.5, 3, 1.5);
        } else if (name.equals("alarm")) {
            // Glocke mit Schallstrichen (Wecker)
            p(dc, [4, 11, 4, 6, 6, 3, 10, 3, 12, 6, 12, 11, 13.5, 12.5, 2.5, 12.5]);
            r(dc, 6.5, 13.5, 3, 1.5);
            r(dc, 0.5, 4, 1.5, 4);
            r(dc, 14, 4, 1.5, 4);
        } else if (name.equals("hg")) {
            // Sanduhr (Fitness-Alter)
            p(dc, [3, 1, 13, 1, 13, 3.5, 9.5, 8, 13, 12.5, 13, 15, 3, 15, 3, 12.5, 6.5, 8, 3, 3.5]);
        } else if (name.equals("recov")) {
            // Uhr (Erholungszeit)
            octRing(dc);
            r(dc, 7.25, 4.5, 1.5, 4);
            r(dc, 7.25, 7.25, 4, 1.5);
        } else if (name.equals("kb")) {
            // Kettlebell (nächste Einheit)
            r(dc, 5, 1, 6, 1.5);
            r(dc, 3.5, 2.5, 1.5, 3.5);
            r(dc, 11, 2.5, 1.5, 3.5);
            p(dc, [5, 6, 11, 6, 13.5, 8.5, 13.5, 12.5, 11, 15, 5, 15, 2.5, 12.5, 2.5, 8.5]);
        } else if (name.equals("in")) {
            // Inhalator (Bufori-Hübe)
            r(dc, 5.5, 1, 3.5, 4.5);
            r(dc, 3.5, 6, 7.5, 8.5);
            r(dc, 11, 10, 3.5, 4.5);
        } else if (name.equals("pill")) {
            // Kapsel, untere Hälfte offen (offene Einnahmen)
            p(dc, [5, 1, 11, 1, 13, 3, 13, 13, 11, 15, 5, 15, 3, 13, 3, 3]);
            holeP(dc, [4.5, 8.5, 11.5, 8.5, 11.5, 12.5, 10.5, 13.5, 5.5, 13.5, 4.5, 12.5]);
        } else if (name.equals("stress")) {
            // Blitz (Stress)
            p(dc, [10, 1, 4, 9, 7.5, 9, 6, 15, 12.5, 6.5, 9, 6.5]);
        } else if (name.equals("floors")) {
            // Treppe (Etagen)
            p(dc, [1, 15, 1, 11, 5, 11, 5, 7, 9, 7, 9, 3, 15, 3, 15, 15]);
        } else if (name.equals("intens")) {
            // Doppelpfeil nach oben (Intensitätsminuten)
            p(dc, [2, 8, 8, 2, 14, 8, 14, 10.5, 8, 4.5, 2, 10.5]);
            p(dc, [2, 13, 8, 7, 14, 13, 14, 15.5, 8, 9.5, 2, 15.5]);
        } else if (name.equals("dist")) {
            // Ortsmarke (Distanz)
            p(dc, [8, 1, 13, 4, 13, 8, 8, 15, 3, 8, 3, 4]);
            holeR(dc, 6.5, 4.5, 3, 3);
        } else if (name.equals("resp")) {
            // Lunge (Atemfrequenz)
            r(dc, 7.25, 1, 1.5, 6);
            p(dc, [2, 6, 4, 4, 6.5, 4, 6.5, 14, 2, 14]);
            p(dc, [9.5, 4, 12, 4, 14, 6, 14, 14, 9.5, 14]);
        } else if (name.equals("alt")) {
            // Berg (Höhe)
            p(dc, [1, 14, 6, 5, 9, 10, 11, 7, 15, 14]);
        } else if (name.equals("press")) {
            // Messuhr (Luftdruck)
            p(dc, [1, 12, 2, 7, 5, 3.5, 8, 2.5, 11, 3.5, 14, 7, 15, 12]);
            holeP(dc, [3.5, 12, 4.3, 8, 6.2, 5.6, 8, 5, 9.8, 5.6, 11.7, 8, 12.5, 12]);
            p(dc, [7.3, 12, 10.5, 6, 8.7, 12]);
        } else if (name.equals("move")) {
            // Balken (Bewegungsbalken)
            r(dc, 1, 11, 2, 4);
            r(dc, 4, 9, 2, 6);
            r(dc, 7, 7, 2, 8);
            r(dc, 10, 5, 2, 10);
            r(dc, 13, 3, 2, 12);
        } else if (name.equals("sleep")) {
            // Mond (Schlafwert)
            p(dc, [9, 1, 5, 2.5, 2.5, 6, 2.5, 10, 5, 13.5, 9, 15, 13, 13.5, 15, 10.5, 11, 11, 8, 9, 7, 5.5]);
        } else if (name.equals("cross")) {
            // Kreuz (krank gemeldet)
            p(dc, [6, 2, 10, 2, 10, 6, 14, 6, 14, 10, 10, 10, 10, 14, 6, 14, 6, 10, 2, 10, 2, 6, 6, 6]);
        }
    }
}
