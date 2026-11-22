// Health Coach · Zifferblatt "Datenraster" für die Fenix 9 Pro
// Holt alle 30 Minuten im Hintergrund eine Kurzübersicht von Health Coach
// (Zyklustag, Tagesziel, Bufori-Hübe, nächste Einheit u. a.) und zeigt sie zusammen mit Garmin-Werten.
// Welche Werte in welchem Feld stehen und welche Farbe jeder Bereich hat, wird in Garmin Connect eingestellt.

import Toybox.Application;
import Toybox.Background;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.WatchUi;

(:background)
class HealthCoachFaceApp extends Application.AppBase {

    var view = null;

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() {
        scheduleSync();
        view = new FaceView();
        return [view];
    }

    function getServiceDelegate() {
        return [new SyncDelegate()];
    }

    function onBackgroundData(data) {
        if (data instanceof Dictionary) {
            Application.Storage.setValue("today", data);
        }
        WatchUi.requestUpdate();
    }

    function onSettingsChanged() {
        // Felder und Farben aus Garmin Connect neu laden
        if (view != null) {
            view.loadSettings();
        }
        scheduleSync();
        WatchUi.requestUpdate();
    }

    function scheduleSync() {
        if (Toybox.System has :ServiceDelegate) {
            Background.registerForTemporalEvent(new Time.Duration(30 * 60));
        }
    }
}
