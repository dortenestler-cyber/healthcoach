import Toybox.Application;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

// Aufruf der Supabase-Funktion "watch" über das Handy
module Api {

    function call(action, payload, callback) {
        var token = null;
        var base = null;
        try {
            token = Application.Properties.getValue("token");
            base = Application.Properties.getValue("baseUrl");
        } catch (e) {
            token = null;
        }
        // Leerzeichen und Zeilenumbrüche aus dem eingetragenen Schlüssel entfernen
        if (token instanceof String) {
            token = trim(token);
        }
        if (base instanceof String) {
            base = trim(base);
        }
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
        try {
            Communications.makeWebRequest(base + "/functions/v1/watch", payload, options, callback);
        } catch (e) {
            callback.invoke(-1, {"error" => e.getErrorMessage()});
        }
    }

    // Entfernt Leerzeichen, Zeilenumbrüche und Tabs ohne Hilfsfunktionen aus der Standardbibliothek
    function trim(s) {
        var out = "";
        var chars = s.toCharArray();
        for (var i = 0; i < chars.size(); i++) {
            var c = chars[i];
            if (c != ' ' && c != '\n' && c != '\r' && c != '\t') {
                out += c;
            }
        }
        return out;
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
        if (code == -300) {
            return "ZEITÜBERSCHREITUNG";
        }
        if (code == -400) {
            return "ANTWORT UNLESBAR";
        }
        if (code == -402 || code == -403) {
            return "ANTWORT ZU GROSS";
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
        try {
            handle(code, data);
        } catch (e) {
            // Nie abstürzen: den Grund auf der Uhr zeigen, damit er sich beheben lässt
            var msg = e.getErrorMessage();
            var text = msg == null ? "UNBEKANNT" : msg.toString().toUpper();
            if (text.length() > 24) {
                text = text.substring(0, 24);
            }
            try {
                WatchUi.pushView(new InfoView(["FEHLER AUF DER UHR", text]), new InfoDelegate(), WatchUi.SLIDE_UP);
            } catch (e2) {
            }
        }
    }

    function handle(code, data) {
        if (code == 200 && data instanceof Dictionary) {
            Store.save(data);
            WatchUi.requestUpdate();
            if (mAfter != null) {
                if (Attention has :vibrate) {
                    Attention.vibrate([new Attention.VibeProfile(60, 150)]);
                }
                WatchUi.pushView(new InfoView(mAfter), new InfoDelegate(), WatchUi.SLIDE_UP);
            }
        } else {
            var lines = ["FEHLER " + code.toString(), Api.errorText(code)];
            // Grund vom Server anzeigen, falls vorhanden
            if (data instanceof Dictionary && data["error"] != null) {
                var msg = data["error"].toString().toUpper();
                if (msg.length() > 24) {
                    lines.add(msg.substring(0, 24));
                    lines.add(msg.substring(24, msg.length() > 48 ? 48 : msg.length()));
                } else {
                    lines.add(msg);
                }
            }
            WatchUi.pushView(new InfoView(lines), new InfoDelegate(), WatchUi.SLIDE_UP);
        }
    }
}
