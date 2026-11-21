import Toybox.Lang;
import Toybox.WatchUi;

// Morgen-Check-in in drei Fragen, Werte 1 niedrig · 2 mittel · 3 gut
module Checkin {

    function questions() {
        return ["ENERGIE", "SCHLAFGEFÜHL", "STIMMUNG"];
    }

    function menu(step) {
        var m = new WatchUi.Menu2({:title => questions()[step]});
        m.addItem(new WatchUi.MenuItem("GUT", null, 3, null));
        m.addItem(new WatchUi.MenuItem("MITTEL", null, 2, null));
        m.addItem(new WatchUi.MenuItem("NIEDRIG", null, 1, null));
        return m;
    }

    function planLines(t) {
        var lines = ["HEUTE GEPLANT"];
        var plan = t["plan"];
        if (plan == null || plan.size() == 0) {
            lines.add("FREI");
            return lines;
        }
        for (var i = 0; i < plan.size(); i++) {
            var p = plan[i];
            var line = p["label"];
            if (p["time"] != null && p["time"] != "") {
                line += " " + p["time"];
            }
            if (p["done"] == true) {
                line += " ✓";
            } else if (p["note"] != null && p["note"] != "") {
                line += " " + p["note"];
            }
            lines.add(line);
        }
        return lines;
    }
}

class CheckinDelegate extends WatchUi.Menu2InputDelegate {
    var mStep;
    var mAnswers;

    function initialize(step, answers) {
        Menu2InputDelegate.initialize();
        mStep = step;
        mAnswers = answers;
    }

    function onSelect(item) {
        mAnswers.add(item.getId());
        if (mStep < 2) {
            WatchUi.switchToView(Checkin.menu(mStep + 1), new CheckinDelegate(mStep + 1, mAnswers), WatchUi.SLIDE_LEFT);
            return;
        }
        WatchUi.switchToView(MainMenu.build(Store.today()), new MainMenuDelegate(), WatchUi.SLIDE_RIGHT);
        Api.call("checkin", {"energy" => mAnswers[0], "sleep" => mAnswers[1], "mood" => mAnswers[2]}, new Net(["CHECK-IN", "GESPEICHERT"]).method(:onReceive));
    }

    function onBack() {
        WatchUi.switchToView(MainMenu.build(Store.today()), new MainMenuDelegate(), WatchUi.SLIDE_RIGHT);
    }
}
