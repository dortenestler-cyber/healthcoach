import Toybox.Application;
import Toybox.Background;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;

// Läuft im Hintergrund: Kurzübersicht von der Funktion "watch" holen
(:background)
class SyncDelegate extends System.ServiceDelegate {

    function initialize() {
        ServiceDelegate.initialize();
    }

    function onTemporalEvent() {
        var token = Application.Properties.getValue("token");
        var base = Application.Properties.getValue("baseUrl");
        if (token == null || !(token instanceof String) || token.length() < 10) {
            Background.exit(null);
            return;
        }
        if (base == null || !(base instanceof String) || base.length() < 10) {
            base = "https://fkvhuxjsdvssmupewwgl.supabase.co";
        }
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => {
                "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON,
                "Authorization" => "Bearer " + token
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(base + "/functions/v1/watch", {"action" => "today", "compact" => true}, options, method(:onReceive));
    }

    function onReceive(code, data) {
        if (code == 200 && data instanceof Dictionary) {
            Background.exit(data);
        } else {
            Background.exit(null);
        }
    }
}
