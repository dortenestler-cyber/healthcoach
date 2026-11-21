import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

// Aufruf der Supabase-Funktion "watch" über das Handy
module Api {

    function call(action, payload, callback) {
        var token = Application.Properties.getValue("token");
        var base = Application.Properties.getValue("baseUrl");
        if (token == null || !(token instanceof String) || token.length() < 10) {
            callback.invoke(-401, null);
            return;
        }
        if (base == null || !(base instanceof String) || base.length() < 10) {
            base = "https://fkvhuxjsdvssmupewwgl.supabase.co";
        }
        if (payload == null) {
            payload = {};
        }
        payload.put("action", action);
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => {
                "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON,
                "Authorization" => "Bearer " + token
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(base + "/functions/v1/watch", payload, options, callback);
    }

    function errorText(code) {
        if (code == -401) {
            return "UHR-SCHLÜSSEL FEHLT";
        }
        if (code == 401) {
            return "SCHLÜSSEL UNGÜLTIG";
        }
        if (code == -104 || code == -2) {
            return "KEIN HANDY";
        }
        if (code == -300 || code == -400) {
            return "ZEITÜBERSCHREITUNG";
        }
        return "CODE " + code.toString();
    }
}

// Verarbeitet die Antwort: Übersicht speichern, Menü neu aufbauen, Hinweis zeigen
class Net {
    var mAfter;

    function initialize(after) {
        mAfter = after;
    }

    function onReceive(code, data) {
        if (code == 200 && data instanceof Dictionary) {
            Store.save(data);
            WatchUi.switchToView(MainMenu.build(data), new MainMenuDelegate(), WatchUi.SLIDE_IMMEDIATE);
            if (mAfter != null) {
                WatchUi.pushView(new InfoView(mAfter), new InfoDelegate(), WatchUi.SLIDE_UP);
            }
        } else {
            WatchUi.pushView(new InfoView(["FEHLER", Api.errorText(code)]), new InfoDelegate(), WatchUi.SLIDE_UP);
        }
    }
}
