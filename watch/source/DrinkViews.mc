import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

// Getränke: Stand des Tages mit Glas (DrinkView) und Mengenwahl je Getränk (AmountView)

// Stand des Tages: Glas mit Füllstand, Menge, Ziel, Tassen Kaffee
class DrinkView extends WatchUi.View {

    function initialize() {
        View.initialize();
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var t = Store.today();
        var d = null;
        if (t != null && t instanceof Dictionary && t["drinks"] instanceof Dictionary) {
            d = t["drinks"];
        }
        var water = d != null && d["water"] != null ? d["water"].toFloat() : 0.0;
        var goal = d != null && d["goal"] != null ? d["goal"].toFloat() : 2.0;
        var coffee = d != null && d["coffee"] != null ? d["coffee"] : 0;
        var p = goal > 0 ? water / goal : 0;
        if (p > 1) {
            p = 1;
        }

        Icons.glass(dc, cx, h * 0.12, w * 0.2, h * 0.3, p, 0);
        dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2);
        for (var q = 1; q <= 3; q++) {
            var ty = h * 0.12 + h * 0.3 * (1 - q / 4.0);
            dc.drawLine(cx + w * 0.12, ty, cx + w * 0.15, ty);
        }
        dc.setColor(Icons.BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.55, Graphics.FONT_MEDIUM, Icons.num(water) + " L", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.65, Graphics.FONT_XTINY, p >= 1 ? "ZIEL ERREICHT" : "VON " + Icons.num(goal) + " L", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Icons.GHOST, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.drawLine(w * 0.34, h * 0.71, w * 0.66, h * 0.71);
        var n = coffee.toNumber();
        var shown = n > 3 ? n : 3;
        var s = w * 0.07;
        var x0 = cx - (shown * s * 1.7) / 2 + s * 0.2;
        for (var i = 0; i < shown; i++) {
            Icons.cup(dc, x0 + i * s * 1.7, h * 0.74, s, i < n);
        }
        dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.87, Graphics.FONT_XTINY, "KAFFEE " + Icons.num(coffee), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}

class DrinkDelegate extends WatchUi.BehaviorDelegate {

    function initialize() {
        BehaviorDelegate.initialize();
    }

    function open() {
        var v = new MenuView(1);
        WatchUi.pushView(v, new MenuDelegate(v), WatchUi.SLIDE_LEFT);
    }

    function onSelect() {
        open();
        return true;
    }

    function onTap(evt) {
        open();
        return true;
    }

    function onBack() {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }
}

// Menge wählen und speichern. Die Uhrzeit ist der Moment des Tippens (der Server setzt sie).
class AmountView extends WatchUi.View {
    var mKind;
    var mOptions;
    var mIdx = 0;

    function initialize(kind) {
        View.initialize();
        mKind = kind;
        if (kind.equals("wasser")) {
            mOptions = [0.25, 0.5, 1.0];
            mIdx = 1;
        } else {
            mOptions = [1, 2];
        }
    }

    function title() {
        if (mKind.equals("wasser")) {
            return "WASSER";
        } else if (mKind.equals("kaffee")) {
            return "KAFFEE";
        } else if (mKind.equals("tee")) {
            return "TEE";
        }
        return "ALKOHOL";
    }

    function amount() {
        return mOptions[mIdx];
    }

    // "0,5 L", "1 TASSE", "2 GLÄSER"
    function amountText() {
        var a = amount();
        if (mKind.equals("wasser")) {
            return Icons.num(a) + " L";
        }
        var one = a == 1;
        if (mKind.equals("alkohol")) {
            return Icons.num(a) + (one ? " GLAS" : " GLÄSER");
        }
        return Icons.num(a) + (one ? " TASSE" : " TASSEN");
    }

    function move(delta) {
        mIdx += delta;
        if (mIdx < 0) {
            mIdx = 0;
        }
        if (mIdx > mOptions.size() - 1) {
            mIdx = mOptions.size() - 1;
        }
        WatchUi.requestUpdate();
    }

    function save() {
        var clock = System.getClockTime();
        var hh = clock.hour;
        var after = [title(), amountText() + " · " + hh.format("%d") + ":" + clock.min.format("%02d")];
        if (mKind.equals("kaffee") && hh >= 14) {
            after.add("NACH 14 UHR");
        }
        // Zurück zur Hauptliste: Menge, Getränkeliste, Stand
        WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
        WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
        WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
        Api.call("drink", {"kind" => mKind, "amount" => amount()}, new Net(after).method(:onReceive));
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var t = Store.today();
        var d = null;
        if (t != null && t instanceof Dictionary && t["drinks"] instanceof Dictionary) {
            d = t["drinks"];
        }
        dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.09, Graphics.FONT_XTINY, title(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        var clock = System.getClockTime();
        var nowH = clock.hour + clock.min / 60.0;
        if (mKind.equals("wasser")) {
            var water = d != null && d["water"] != null ? d["water"].toFloat() : 0.0;
            var goal = d != null && d["goal"] != null ? d["goal"].toFloat() : 2.0;
            var p = water / goal;
            var p2 = (water + amount()) / goal;
            Icons.glass(dc, cx, h * 0.16, w * 0.18, h * 0.28, p > 1 ? 1 : p, p2 > 1 ? 1 : p2);
        } else if (mKind.equals("alkohol")) {
            var a = amount().toNumber();
            for (var i = 0; i < a; i++) {
                Icons.wine(dc, cx - (a - 1) * w * 0.05 + i * w * 0.1, h * 0.2, w * 0.07, true);
            }
        } else {
            var c = amount().toNumber();
            var s = w * 0.08;
            for (var j = 0; j < c; j++) {
                Icons.cup(dc, cx - (c * s * 1.6) / 2 + j * s * 1.6, h * 0.2, s, true);
            }
            if (mKind.equals("kaffee")) {
                var hours = d != null ? d["coffeeAt"] : null;
                Icons.timeline(dc, w * 0.2, w * 0.8, h * 0.4, hours, nowH);
                dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
                dc.drawText(w * 0.2, h * 0.47, Graphics.FONT_XTINY, "6", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
                dc.drawText(cx, h * 0.47, Graphics.FONT_XTINY, "14", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
                dc.drawText(w * 0.8, h * 0.47, Graphics.FONT_XTINY, "22", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            }
        }
        var late = mKind.equals("kaffee") && nowH >= 14;
        dc.setColor(late ? Icons.AMBER : Icons.BRIGHT, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.6, Graphics.FONT_MEDIUM, mKind.equals("wasser") ? "+" + amountText() : amountText(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        if (late) {
            dc.drawText(cx, h * 0.71, Graphics.FONT_XTINY, "KOFFEIN NACH 14 UHR", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
        // Auswahlpunkte
        for (var k = 0; k < mOptions.size(); k++) {
            dc.setColor(k == mIdx ? Icons.BRIGHT : Icons.MUTED, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(cx + (k - (mOptions.size() - 1) / 2.0) * w * 0.06, h * 0.81, k == mIdx ? 4 : 3);
        }
        dc.setColor(Icons.MUTED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.89, Graphics.FONT_XTINY, "HOCH/RUNTER · START", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}

class AmountDelegate extends WatchUi.BehaviorDelegate {
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

    function onSelect() {
        mView.save();
        return true;
    }

    function onBack() {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }
}
