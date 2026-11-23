import Toybox.Application;
import Toybox.Lang;

// Zwischenspeicher für die Übersicht von heute, auch für den Glance
(:glance)
module Store {

    function today() {
        try {
            return Application.Storage.getValue("today");
        } catch (e) {
            return null;
        }
    }

    function save(t) {
        // Ein einzelner Wert darf auf der Uhr nur etwa 8 KB groß sein: bei Überlauf ohne Kettlebell-Plan speichern
        try {
            Application.Storage.setValue("today", t);
        } catch (e) {
            try {
                var slim = {};
                var keys = t.keys();
                for (var i = 0; i < keys.size(); i++) {
                    if (!keys[i].equals("kb")) {
                        slim.put(keys[i], t[keys[i]]);
                    }
                }
                Application.Storage.setValue("today", slim);
            } catch (e2) {
            }
        }
    }

    // Sicherer Zugriff auf Werte, die fehlen können
    function str(v) {
        if (v == null) {
            return "–";
        }
        return v.toString();
    }
}
