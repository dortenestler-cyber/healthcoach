// Health Coach · Uhr-App für die Fenix 9 Pro
// Getränke mit Füllstand, Infektverdacht, Einnahmen, Check-in, Heute geplant, Kettlebell-Timer.
// Spricht über das Handy mit der Supabase-Funktion "watch" und meldet sich mit dem Uhr-Schlüssel an.

import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

(:glance)
class HealthCoachApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() {
        var view = new MenuView(0);
        // Beim Öffnen gleich die aktuelle Übersicht holen
        try {
            Api.call("today", {}, new Net(null).method(:onReceive));
        } catch (e) {
        }
        return [view, new MenuDelegate(view)];
    }

    (:glance)
    function getGlanceView() {
        return [new HcGlanceView()];
    }

    function onSettingsChanged() {
        Api.call("today", {}, new Net(null).method(:onReceive));
    }
}
