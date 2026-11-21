import Toybox.Lang;
import Toybox.WatchUi;

// Hauptmenü, aufgebaut aus der Übersicht von heute
module MainMenu {

    function build(t) {
        var menu = new WatchUi.Menu2({:title => "HEALTH COACH"});
        if (t == null || !(t instanceof Dictionary)) {
            menu.addItem(new WatchUi.MenuItem("LADEN", "HOLT DATEN …", "refresh", null));
            return menu;
        }
        if (t["illness"] != null) {
            menu.addItem(new WatchUi.MenuItem(t["illness"], t["pause"] == true ? "TRAINING: PAUSE" : "NUR LEICHT", "info", null));
        }
        menu.addItem(new WatchUi.MenuItem("HITZEWALLUNG", "24 H: " + Store.str(t["flashes24h"]), "flash", null));

        var needed = t["needed"];
        if (needed != null) {
            for (var i = 0; i < needed.size(); i++) {
                var n = needed[i];
                menu.addItem(new WatchUi.MenuItem(n["label"] + " BEDARF", "HEUTE " + Store.str(n["today"]) + " · WOCHE " + Store.str(n["week"]), "need:" + i, null));
            }
        }

        var slots = t["slots"];
        if (slots != null) {
            for (var j = 0; j < slots.size(); j++) {
                var s = slots[j];
                menu.addItem(new WatchUi.MenuItem(s["label"] + " " + s["slot"], s["done"] == true ? "GENOMMEN" : "ABHAKEN", "slot:" + j, null));
            }
        }

        menu.addItem(new WatchUi.MenuItem("CHECK-IN", t["checkinDone"] == true ? "ERLEDIGT" : "3 FRAGEN", "checkin", null));

        var plan = t["plan"];
        var planSub = "FREI";
        if (plan != null && plan.size() > 0) {
            var p = plan[0];
            planSub = p["label"] + (p["time"] != null && p["time"] != "" ? " " + p["time"] : "");
            if (p["done"] == true) {
                planSub += " ✓";
            } else if (p["note"] != null && p["note"] != "") {
                planSub += " · " + p["note"];
            }
        }
        menu.addItem(new WatchUi.MenuItem("HEUTE GEPLANT", planSub, "plan", null));

        var kb = t["kb"];
        menu.addItem(new WatchUi.MenuItem("KETTLEBELL", kb != null ? "WOCHE " + Store.str(kb["week"]) : "KEIN PLAN", "kb", null));
        menu.addItem(new WatchUi.MenuItem("AKTUALISIEREN", "STAND " + Store.str(t["time"]), "refresh", null));
        return menu;
    }

    function indexOf(id, prefix) {
        return id.substring(prefix.length(), id.length()).toNumber();
    }
}

class MainMenuDelegate extends WatchUi.Menu2InputDelegate {

    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item) {
        var id = item.getId();
        var t = Store.today();
        if (id.equals("flash")) {
            item.setSubLabel("SENDET …");
            WatchUi.requestUpdate();
            Api.call("flash", {}, new Net(["HITZEWALLUNG", "GESPEICHERT"]).method(:onReceive));
        } else if (id.find("need:") == 0 && t != null) {
            var n = t["needed"][MainMenu.indexOf(id, "need:")];
            item.setSubLabel("SENDET …");
            WatchUi.requestUpdate();
            var after = n["bufori"] == true ? ["HUB GESPEICHERT", "MUND", "AUSSPÜLEN"] : ["GESPEICHERT"];
            Api.call("intake", {"medication_ids" => [n["id"]], "as_needed" => true}, new Net(after).method(:onReceive));
        } else if (id.find("slot:") == 0 && t != null) {
            var s = t["slots"][MainMenu.indexOf(id, "slot:")];
            if (s["done"] == true) {
                WatchUi.pushView(new InfoView(["SCHON", "ABGEHAKT"]), new InfoDelegate(), WatchUi.SLIDE_UP);
                return;
            }
            item.setSubLabel("SENDET …");
            WatchUi.requestUpdate();
            var after2 = s["bufori"] == true ? ["GENOMMEN", "MUND", "AUSSPÜLEN"] : ["GENOMMEN"];
            Api.call("intake", {"medication_ids" => s["ids"], "as_needed" => false, "slot" => s["slot"]}, new Net(after2).method(:onReceive));
        } else if (id.equals("checkin")) {
            WatchUi.switchToView(Checkin.menu(0), new CheckinDelegate(0, []), WatchUi.SLIDE_LEFT);
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
            item.setSubLabel("LÄDT …");
            WatchUi.requestUpdate();
            Api.call("today", {}, new Net(null).method(:onReceive));
        }
    }
}
