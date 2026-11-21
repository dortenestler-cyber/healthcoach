import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

// Einfache Anzeige mit ein paar Zeilen, dunkel und einfarbig wie das Datenraster
class InfoView extends WatchUi.View {
    var mLines;

    function initialize(lines) {
        View.initialize();
        mLines = lines;
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var lineH = dc.getFontHeight(Graphics.FONT_SMALL) + 6;
        var top = h / 2 - (mLines.size() * lineH) / 2 + lineH / 2;
        for (var i = 0; i < mLines.size(); i++) {
            dc.setColor(i == 0 ? Graphics.COLOR_LT_GRAY : Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, top + i * lineH, i == 0 ? Graphics.FONT_XTINY : Graphics.FONT_SMALL, mLines[i], Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }
}

class InfoDelegate extends WatchUi.BehaviorDelegate {

    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }

    function onBack() {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }
}
