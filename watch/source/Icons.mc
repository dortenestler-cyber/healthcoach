import Toybox.Graphics;
import Toybox.Lang;

// Kleine Zeichen für den Zustand: Glas mit Füllstand, Tasse, Kreis, Ring, Zeitleiste.
// Dunkel und einfarbig wie das Datenraster. Amber nur für Koffein nach 14 Uhr.
module Icons {
    const BRIGHT = 0xE4E5DF;
    const MUTED = 0x7E8085;
    const GHOST = 0x2A2B2F;
    const PREVIEW = 0x5A5C60;
    const AMBER = 0xF0A24A;

    // Fläche des Glases bis zum Füllstand q (0 bis 1)
    function fillLevel(dc, cx, top, w, h, q, color) {
        if (q <= 0) {
            return;
        }
        if (q > 1) {
            q = 1;
        }
        var inset = w * 0.14;
        var yTop = top + h * (1 - q);
        var halfTop = w / 2.0 - inset * (1 - q);
        var halfBot = w / 2.0 - inset;
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon([[cx - halfTop, yTop], [cx + halfTop, yTop], [cx + halfBot, top + h], [cx - halfBot, top + h]]);
    }

    // Glas mit Füllstand p; p2 größer als p zeigt eine blasse Vorschau
    function glass(dc, cx, top, w, h, p, p2) {
        if (p2 > p) {
            fillLevel(dc, cx, top, w, h, p2, PREVIEW);
        }
        fillLevel(dc, cx, top, w, h, p, BRIGHT);
        var inset = w * 0.14;
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        dc.drawLine(cx - w / 2.0, top, cx - w / 2.0 + inset, top + h);
        dc.drawLine(cx + w / 2.0, top, cx + w / 2.0 - inset, top + h);
        dc.drawLine(cx - w / 2.0 + inset, top + h, cx + w / 2.0 - inset, top + h);
        dc.drawLine(cx - w / 2.0, top, cx + w / 2.0, top);
    }

    // Tasse, gefüllt wenn getrunken
    function cup(dc, x, y, s, on) {
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        if (on) {
            dc.fillRectangle(x, y, s, s * 0.8);
        } else {
            dc.drawRectangle(x, y, s, s * 0.8);
        }
        dc.drawRectangle(x + s, y + s * 0.15, s * 0.28, s * 0.4);
    }

    // Weinglas für Alkohol
    function wine(dc, cx, y, s, on) {
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        if (on) {
            dc.fillPolygon([[cx - s / 2.0, y], [cx + s / 2.0, y], [cx, y + s]]);
        } else {
            dc.drawLine(cx - s / 2.0, y, cx, y + s);
            dc.drawLine(cx + s / 2.0, y, cx, y + s);
            dc.drawLine(cx - s / 2.0, y, cx + s / 2.0, y);
        }
        dc.drawLine(cx, y + s, cx, y + s * 1.5);
        dc.drawLine(cx - s / 3.0, y + s * 1.5, cx + s / 3.0, y + s * 1.5);
    }

    // Kreis: leer oder gefüllt
    function dot(dc, cx, cy, r, filled) {
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        if (filled) {
            dc.fillCircle(cx, cy, r);
        } else {
            dc.drawCircle(cx, cy, r);
        }
    }

    // Ring mit Fortschritt p (0 bis 1)
    function ring(dc, cx, cy, r, p) {
        dc.setPenWidth(3);
        dc.setColor(GHOST, Graphics.COLOR_TRANSPARENT);
        dc.drawCircle(cx, cy, r);
        if (p <= 0) {
            return;
        }
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        if (p >= 0.99) {
            dc.drawCircle(cx, cy, r);
            return;
        }
        var end = (90 - 360 * p).toNumber();
        if (end < 0) {
            end += 360;
        }
        dc.drawArc(cx, cy, r, Graphics.ARC_CLOCKWISE, 90, end);
    }

    // Zeitleiste von 6 bis 22 Uhr mit einem Punkt je Tasse; ab 14 Uhr amber
    function timeline(dc, x0, x1, y, hours, nowH) {
        var span = x1 - x0;
        dc.setPenWidth(3);
        dc.setColor(GHOST, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(x0, y, x1, y);
        var lim = x0 + span * 8 / 16.0;
        dc.setColor(MUTED, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        dc.drawLine(lim, y - 8, lim, y + 8);
        if (hours instanceof Array) {
            for (var i = 0; i < hours.size(); i++) {
                var hv = hours[i];
                dc.setColor(hv >= 14 ? AMBER : BRIGHT, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x0 + span * (hv - 6) / 16.0, y, 5);
            }
        }
        if (nowH != null) {
            var nx = x0 + span * (nowH - 6) / 16.0;
            if (nowH < 6) {
                nx = x0;
            } else if (nowH > 22) {
                nx = x1;
            }
            dc.setColor(nowH >= 14 ? AMBER : BRIGHT, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(2);
            dc.drawCircle(nx, y, 7);
        }
    }

    // Zahl mit Komma, höchstens zwei Stellen: 1.5 → "1,5", 0.25 → "0,25", 2 → "2"
    function num(v) {
        if (v == null) {
            return "0";
        }
        var n = (v.toFloat() * 100 + 0.5).toNumber();
        var whole = n / 100;
        var rem = n % 100;
        if (rem == 0) {
            return whole.toString();
        }
        if (rem % 10 == 0) {
            return whole.toString() + "," + (rem / 10).toString();
        }
        return whole.toString() + "," + rem.format("%02d");
    }
}
