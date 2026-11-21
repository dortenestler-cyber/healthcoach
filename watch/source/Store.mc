import Toybox.Application;
import Toybox.Lang;

// Zwischenspeicher für die Übersicht von heute, auch für den Glance
(:glance)
module Store {

    function today() {
        return Application.Storage.getValue("today");
    }

    function save(t) {
        Application.Storage.setValue("today", t);
    }

    // Sicherer Zugriff auf Werte, die fehlen können
    function str(v) {
        if (v == null) {
            return "–";
        }
        return v.toString();
    }
}
