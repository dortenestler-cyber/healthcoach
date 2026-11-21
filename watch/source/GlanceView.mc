import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Glance: kurze Zeile mit Hitzewallungen, Bedarfs-Hüben und der nächsten Einheit
(:glance)
class HcGlanceView extends WatchUi.GlanceView {

    function initialize() {
        GlanceView.initialize();
    }

    function onUpdate(dc) {
        var h = dc.getHeight();
        var t = Store.today();
        var line = "APP ÖFFNEN";
        if (t != null && t instanceof Dictionary) {
            line = "HITZE " + Store.str(t["flashes24h"]);
            var needed = t["needed"];
            if (needed != null && needed.size() > 0) {
                line += " · HUB " + Store.str(needed[0]["today"]);
            }
            var plan = t["plan"];
            if (t["pause"] == true) {
                line += " · PAUSE";
            } else if (plan != null && plan.size() > 0) {
                line += " · " + plan[0]["label"];
            }
        }
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, h / 4, Graphics.FONT_GLANCE, "HEALTH COACH", Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, (h * 3) / 4, Graphics.FONT_GLANCE, line, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}
