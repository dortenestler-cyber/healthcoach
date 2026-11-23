import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Glance nach Vorlage (docs/bilder/vorlagen/18-uhr-glance.png):
// Tagesziel bisher in Segmentziffern mit Geisterziffern, Zielbereich, Faktoren mit Abzug, nächste Einheit.
// Dunkel und einfarbig wie das Zifferblatt "Datenraster".
(:glance)
class HcGlanceView extends WatchUi.GlanceView {

    const BRIGHT = 0xE4E5DF;
    const MUTED = 0x7E8085;
    const GHOST = 0x2A2B2F;

    // 7-Segment: welche Balken je Ziffer leuchten
    const SEGS = {'0' => "abcdef", '1' => "bc", '2' => "abged", '3' => "abgcd", '4' => "fgbc", '5' => "afgcd", '6' => "afgedc", '7' => "abc", '8' => "abcdefg", '9' => "abcdfg"};

    function initialize() {
        GlanceView.initialize();
    }

    function onUpdate(dc) {
        var h = dc.getHeight();
        var font = Graphics.FONT_GLANCE;
        var fh = dc.getFontHeight(font);
        var small = Graphics.FONT_XTINY;
        var sh = dc.getFontHeight(small);
        var t = Store.today();
        var mid = Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER;

        if (t == null || !(t instanceof Dictionary) || t["load"] == null) {
            dc.setColor(MUTED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(0, h / 4, font, "TAGESZIEL", mid);
            dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
            dc.drawText(0, (h * 3) / 4, font, "APP ÖFFNEN", mid);
            return;
        }

        var pause = t["pause"] == true;

        // Kopf: Tagesziel und Zielbereich
        var head = "TAGESZIEL";
        var band = t["band"];
        if (pause) {
            head += " · PAUSE";
        } else if (band instanceof Array && band.size() == 2) {
            head += " · VON " + band[0].toString() + "–" + band[1].toString() + " %";
        }
        dc.setColor(MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, sh / 2, small, head, mid);

        // Fuß: nächste Einheit
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, h - sh / 2, small, nextLine(t, pause), mid);

        // Mitte: Prozent bisher als Segmentziffern, rechts daneben die Faktoren
        var top = sh + 2;
        var avail = h - 2 * sh - 4;
        if (avail < 12) {
            return;
        }
        var dh = avail;
        var dw = (dh * 11) / 20;
        var th = dh / 9 < 2 ? 2 : dh / 9;
        var gap = th + 1;
        var v = t["load"].toNumber();
        if (v > 99) {
            v = 99;
        }
        var s = v.toString();
        if (s.length() < 2) {
            s = " " + s;
        }
        var chars = s.toCharArray();
        for (var i = 0; i < 2; i++) {
            digit(dc, i * (dw + gap), top, dw, dh, th, chars[i]);
        }
        var x = 2 * (dw + gap) + gap;
        dc.setColor(MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, top + dh - sh / 2, small, "%", mid);
        x += dc.getTextWidthInPixels("%", small) + 2 * gap;

        // Faktoren mit Abzug, zwei je Zeile
        var lines = factorLines(t["factors"]);
        var n = avail / fh;
        if (n < 1) {
            n = 1;
        }
        if (lines.size() < n) {
            n = lines.size();
        }
        dc.setColor(BRIGHT, Graphics.COLOR_TRANSPARENT);
        for (var j = 0; j < n; j++) {
            var y = top + (avail * (2 * j + 1)) / (2 * n);
            dc.drawText(x, y, n > 1 ? small : font, lines[j], mid);
        }
    }

    // "SCHLAF -8  HRV -10" usw., nur Faktoren mit Abzug
    function factorLines(f) {
        var out = [];
        if (!(f instanceof Array)) {
            return out;
        }
        var items = [];
        for (var i = 0; i < f.size(); i++) {
            var e = f[i]["e"];
            if (e != null && e < 0) {
                items.add(f[i]["k"].toString() + " " + e.toString());
            }
        }
        if (items.size() == 0) {
            out.add("KEIN ABZUG");
            return out;
        }
        for (var j = 0; j < items.size(); j += 2) {
            var line = items[j];
            if (j + 1 < items.size()) {
                line += "  " + items[j + 1];
            }
            out.add(line);
        }
        return out;
    }

    function nextLine(t, pause) {
        if (pause) {
            return "HEUTE ERHOLUNG";
        }
        var plan = t["plan"];
        if (plan instanceof Array) {
            for (var i = 0; i < plan.size(); i++) {
                if (plan[i]["done"] != true) {
                    var s = "NÄCHSTES: " + plan[i]["label"];
                    var tm = plan[i]["time"];
                    if (tm != null && tm.toString().length() > 0) {
                        s += " " + tm;
                    }
                    var note = plan[i]["note"];
                    if (note != null && note.toString().length() > 0) {
                        s += " · " + note;
                    }
                    return s;
                }
            }
            if (plan.size() > 0) {
                return "TRAINING ERLEDIGT";
            }
        }
        return "HEUTE KEIN TRAINING";
    }

    // Eine Ziffer im 7-Segment-Stil, dunkle Geister-Segmente zuerst
    function digit(dc, x, y, w, h, t, ch) {
        var lit = SEGS[ch];
        if (lit == null) {
            lit = "";
        }
        var hv = h / 2;
        var ht = t / 2;
        var segs = "abcdefg".toCharArray();
        for (var pass = 0; pass < 2; pass++) {
            for (var i = 0; i < segs.size(); i++) {
                var isOn = lit.find(segs[i].toString()) != null;
                if ((pass == 0 && isOn) || (pass == 1 && !isOn)) {
                    continue;
                }
                dc.setColor(isOn ? BRIGHT : GHOST, Graphics.COLOR_TRANSPARENT);
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
}
