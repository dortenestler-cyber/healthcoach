import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

// Hauptansicht und Getränkeliste: eine Liste aus Zeilen, jede mit einem Zeichen für den Zustand.
// Dunkel und einfarbig. HOCH/RUNTER wählt, START oder Tippen öffnet.
// Modus 0: Hauptliste · Modus 1: Getränkearten
class MenuView extends WatchUi.View {
    var mMode;
    var mCursor = 0;
    var mFirst = 0;

    function initialize(mode) {
        View.initialize();
        mMode = mode;
    }

    function drinks(t) {
        if (t != null && t instanceof Dictionary && t["drinks"] instanceof Dictionary) {
            return t["drinks"];
        }
        return null;
    }

    function goal(d) {
        if (d != null && d["goal"] != null) {
            return d["goal"].toFloat();
        }
        return 2.0;
    }

    function water(d) {
        return Icons.fluid(d);
    }

    function rawWater(d) {
        if (d != null && d["water"] != null) {
            return d["water"].toFloat();
        }
        return 0.0;
    }

    // Zeilen: id, label, value, icon (glass, dot, ring, cup, wine), p (0 bis 1 oder Anzahl)
    function rows() {
        var t = Store.today();
        var out = [];
        var d = drinks(t);
        if (mMode == 1) {
            var g = goal(d);
            var w = rawWater(d);
            out.add({"id" => "wasser", "label" => "WASSER", "value" => Icons.num(w) + " L", "icon" => "glass", "p" => Icons.fluid(d) / g});
            out.add({"id" => "kaffee", "label" => "KAFFEE", "value" => "HEUTE " + Icons.num(d != null ? d["coffee"] : 0), "icon" => "cup", "p" => d != null && d["coffee"] != null && d["coffee"] > 0 ? 1 : 0});
            out.add({"id" => "tee", "label" => "TEE", "value" => "HEUTE " + Icons.num(d != null ? d["tea"] : 0), "icon" => "cup", "p" => d != null && d["tea"] != null && d["tea"] > 0 ? 1 : 0});
            out.add({"id" => "alkohol", "label" => "ALKOHOL", "value" => "HEUTE " + Icons.num(d != null ? d["alcohol"] : 0), "icon" => "wine", "p" => d != null && d["alcohol"] != null && d["alcohol"] > 0 ? 1 : 0});
            return out;
        }
        if (t == null || !(t instanceof Dictionary)) {
            out.add({"id" => "refresh", "label" => "LADEN", "value" => "HOLT DATEN …", "icon" => "ring", "p" => 0});
            return out;
        }
        if (t["illness"] != null) {
            out.add({"id" => "illness", "label" => Store.str(t["illness"]), "value" => t["pause"] == true ? "TRAINING: PAUSE" : "NUR LEICHT", "icon" => "dot", "p" => 1});
        }
        var gl = goal(d);
        var wa = water(d);
        out.add({"id" => "drink", "label" => "GETRÄNK", "value" => Icons.num(wa) + " L", "icon" => "glass", "p" => wa / gl});
        var inf = t["infection"] == true;
        out.add({"id" => "infect", "label" => "INFEKT", "value" => inf ? "VERDACHT" : "KEIN VERDACHT", "icon" => "dot", "p" => inf ? 1 : 0});
        var done = t["checkinDone"] == true;
        out.add({"id" => "checkin", "label" => "CHECK-IN", "value" => done ? "ERLEDIGT" : "OFFEN", "icon" => "ring", "p" => done ? 1 : 0});
        // Einnahmen ohne Bufori
        var slots = t["slots"];
        if (slots instanceof Array) {
            for (var j = 0; j < slots.size(); j++) {
                var s = slots[j];
                if (s["bufori"] == true) {
                    continue;
                }
                out.add({"id" => "slot:" + j, "label" => Store.str(s["label"]) + " " + Store.str(s["slot"]), "value" => s["done"] == true ? "GENOMMEN" : "ABHAKEN", "icon" => "ring", "p" => s["done"] == true ? 1 : 0});
            }
        }
        var plan = t["plan"];
        var pv = "FREI";
        var pp = 0;
        if (plan instanceof Array && plan.size() > 0) {
            var p = plan[0];
            pv = Store.str(p["label"]);
            if (p["done"] == true) {
                pp = 1;
            } else if (p["note"] != null && p["note"] != "") {
                pv += " · " + p["note"];
            }
        }
        out.add({"id" => "plan", "label" => "HEUTE GEPLANT", "value" => pv, "icon" => "ring", "p" => pp});
        var kb = t["kb"];
        out.add({"id" => "kb", "label" => "KETTLEBELL", "value" => kb instanceof Dictionary ? "WOCHE " + Store.str(kb["week"]) : "KEIN PLAN", "icon" => "ring", "p" => 0});
        out.add({"id" => "refresh", "label" => "AKTUALISIEREN", "value" => "STAND " + Store.str(t["time"]), "icon" => "ring", "p" => 0});
        return out;
    }

    const VISIBLE = 4;

    function move(delta) {
        var n = rows().size();
        mCursor += delta;
        if (mCursor < 0) {
            mCursor = 0;
        }
        if (mCursor > n - 1) {
            mCursor = n - 1;
        }
        if (mCursor < mFirst) {
            mFirst = mCursor;
        }
        if (mCursor > mFirst + VISIBLE - 1) {
            mFirst = mCursor - VISIBLE + 1;
        }
        WatchUi.requestUpdate();
    }

    function current() {
        var r = rows();
        if (mCursor >= r.size()) {
            mCursor = r.size() - 1;
        }
        return r[mCursor];
    }

    // Zeile unter einem Tippen (y in Pixeln), -1 wenn keine
    function rowAt(y, h) {
        var top = h * 0.17;
        var rh = h * 0.17;
        if (y < top || y > top + rh * VISIBLE) {
            return -1;
        }
        var i = mFirst + ((y - top) / rh).toNumber();
        return i < rows().size() ? i : -1;
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var r = rows();
        if (mCursor >= r.size()) {
            mCursor = r.size() - 1;
        }
        dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.09, Graphics.FONT_XTINY, mMode == 1 ? "GETRÄNK" : "HEALTH COACH", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        var top = h * 0.17;
        var rh = h * 0.17;
        for (var k = 0; k < VISIBLE; k++) {
            var i = mFirst + k;
            if (i >= r.size()) {
                break;
            }
            var row = r[i];
            var y = top + rh * k;
            if (i == mCursor) {
                dc.setColor(0x1C2026, Graphics.COLOR_TRANSPARENT);
                dc.fillRoundedRectangle(w * 0.1, y + 2, w * 0.8, rh - 4, 14);
            }
            var cy = y + rh / 2;
            var ix = w * 0.2;
            var icon = row["icon"];
            if (icon.equals("glass")) {
                Icons.glass(dc, ix, cy - rh * 0.3, rh * 0.42, rh * 0.6, row["p"] > 1 ? 1 : row["p"], 0);
            } else if (icon.equals("cup")) {
                Icons.cup(dc, ix - rh * 0.25, cy - rh * 0.17, rh * 0.34, row["p"] > 0);
            } else if (icon.equals("wine")) {
                Icons.wine(dc, ix, cy - rh * 0.32, rh * 0.36, row["p"] > 0);
            } else if (icon.equals("dot")) {
                Icons.dot(dc, ix, cy, rh * 0.16, row["p"] > 0);
            } else {
                Icons.ring(dc, ix, cy, rh * 0.16, row["p"]);
            }
            dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w * 0.3, cy - rh * 0.22, Graphics.FONT_XTINY, row["label"], Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.setColor(Icons.BRIGHT, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w * 0.3, cy + rh * 0.2, Graphics.FONT_SMALL, row["value"], Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }
}

class MenuDelegate extends WatchUi.BehaviorDelegate {
    var mView;

    function initialize(view) {
        BehaviorDelegate.initialize();
        mView = view;
    }

    function onNextPage() {
        mView.move(1);
        return true;
    }

    function onPreviousPage() {
        mView.move(-1);
        return true;
    }

    function onTap(evt) {
        var coords = evt.getCoordinates();
        var h = System.getDeviceSettings().screenHeight;
        var i = mView.rowAt(coords[1], h);
        if (i < 0) {
            return false;
        }
        mView.mCursor = i;
        WatchUi.requestUpdate();
        activate(mView.current());
        return true;
    }

    function onSelect() {
        activate(mView.current());
        return true;
    }

    function activate(row) {
        var id = row["id"];
        var t = Store.today();
        if (mView.mMode == 1) {
            var amount = new AmountView(id);
            WatchUi.pushView(amount, new AmountDelegate(amount), WatchUi.SLIDE_LEFT);
            return;
        }
        if (id.equals("drink")) {
            var dv = new DrinkView();
            WatchUi.pushView(dv, new DrinkDelegate(), WatchUi.SLIDE_LEFT);
        } else if (id.equals("infect")) {
            var inf = t != null && t["infection"] == true;
            WatchUi.pushView(new InfoView(inf ? ["INFEKTVERDACHT", "IN DER APP PRÜFEN"] : ["KEIN VERDACHT", "WERTE IM BEREICH"]), new InfoDelegate(), WatchUi.SLIDE_UP);
        } else if (id.equals("illness") && t != null) {
            WatchUi.pushView(new InfoView([Store.str(t["illness"]), t["pause"] == true ? "TRAINING: PAUSE" : "NUR LEICHT"]), new InfoDelegate(), WatchUi.SLIDE_UP);
        } else if (id.find("slot:") == 0 && t != null) {
            var s = t["slots"][id.substring(5, id.length()).toNumber()];
            if (s["done"] == true) {
                WatchUi.pushView(new InfoView(["SCHON", "ABGEHAKT"]), new InfoDelegate(), WatchUi.SLIDE_UP);
                return;
            }
            Api.call("intake", {"medication_ids" => s["ids"], "as_needed" => false, "slot" => s["slot"]}, new Net(["GENOMMEN"]).method(:onReceive));
        } else if (id.equals("checkin")) {
            WatchUi.pushView(Checkin.menu(0), new CheckinDelegate(0, []), WatchUi.SLIDE_LEFT);
        } else if (id.equals("plan") && t != null) {
            WatchUi.pushView(new InfoView(Checkin.planLines(t)), new InfoDelegate(), WatchUi.SLIDE_LEFT);
        } else if (id.equals("kb")) {
            if (t == null || t["kb"] == null) {
                WatchUi.pushView(new InfoView(["KEIN", "KETTLEBELL-PLAN"]), new InfoDelegate(), WatchUi.SLIDE_UP);
                return;
            }
            var view = new KbView(t["kb"], t["pause"] == true);
            WatchUi.pushView(view, new KbDelegate(view), WatchUi.SLIDE_LEFT);
        } else if (id.equals("refresh")) {
            Api.call("today", {}, new Net(null).method(:onReceive));
        }
    }
}
