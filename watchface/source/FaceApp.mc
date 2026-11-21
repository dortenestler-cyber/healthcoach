// Health Coach · Zifferblatt "Datenraster" für die Fenix 9 Pro
// Holt alle 30 Minuten im Hintergrund eine Kurzübersicht von Health Coach
// (Zyklustag, Bufori-Hübe, nächste Einheit) und zeigt sie zusammen mit Garmin-Werten.

import Toybox.Application;
import Toybox.Background;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.WatchUi;

(:background)
class HealthCoachFaceApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() {
        scheduleSync();
        return [new FaceView()];
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
        scheduleSync();
        WatchUi.requestUpdate();
    }

    function scheduleSync() {
        if (Toybox.System has :ServiceDelegate) {
            Background.registerForTemporalEvent(new Time.Duration(30 * 60));
        }
    }
}
