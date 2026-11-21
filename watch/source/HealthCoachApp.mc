// Health Coach · Uhr-App für die Fenix 9 Pro
// Hitzewallung, Bufori-Hub, Einnahmen, Check-in, Heute geplant, Kettlebell-Timer.
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
        var menu = MainMenu.build(Store.today());
        // Beim Öffnen gleich die aktuelle Übersicht holen
        Api.call("today", {}, new Net(null).method(:onReceive));
        return [menu, new MainMenuDelegate()];
    }

    (:glance)
    function getGlanceView() {
        return [new HcGlanceView()];
    }

    function onSettingsChanged() {
        Api.call("today", {}, new Net(null).method(:onReceive));
    }
}
