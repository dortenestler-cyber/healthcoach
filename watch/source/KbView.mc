import Toybox.Attention;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

// Kettlebell-Timer nach dem Plan aus der App.
// START: Satz fertig · HOCH/RUNTER: Wiederholungen · MENÜ (HOCH lang): Gewicht · ZURÜCK: Einheit beenden und speichern
class KbView extends WatchUi.View {
    const REST_MS = 60000;

    var mKb;
    var mItems;
    var mIdx = 0;
    var mSet = 1;
    var mReps = 0;
    var mKg = 0;
    var mDone;
    var mRestUntil = 0;
    var mTimer;
    var mLighter = false;
    var mFinished = false;

    function initialize(kb, lighter) {
        View.initialize();
        mKb = kb;
        mItems = kb["items"];
        mLighter = lighter;
        mTimer = new Timer.Timer();
        mDone = [];
        loadItem();
    }

    function loadItem() {
        var it = mItems[mIdx];
        mReps = it["reps"];
        mKg = target();
    }

    // Zielgewicht; an Pausentagen 2 kg leichter
    function target() {
        var kg = mItems[mIdx]["kg"];
        if (kg > 0 && mLighter) {
            kg = kg - 2;
            if (kg < 1) {
                kg = 1;
            }
        }
        return kg;
    }

    function onShow() {
        mTimer.start(method(:onTick), 1000, true);
    }

    function onHide() {
        mTimer.stop();
    }

    function onTick() {
        if (mRestUntil > 0 && System.getTimer() >= mRestUntil) {
            mRestUntil = 0;
            if (Attention has :vibrate) {
                Attention.vibrate([new Attention.VibeProfile(80, 400)]);
            }
        }
        WatchUi.requestUpdate();
    }

    function completeSet() {
        if (mFinished) {
            return;
        }
        var it = mItems[mIdx];
        mDone.add({
            "exercise" => it["exercise"],
            "set_no" => mSet,
            "reps" => mReps,
            "weight_kg" => mKg,
            "target_reps" => it["reps"],
            "target_kg" => target()
        });
        if (mSet < it["sets"]) {
            mSet += 1;
            mReps = it["reps"];
        } else if (mIdx < mItems.size() - 1) {
            mIdx += 1;
            mSet = 1;
            loadItem();
        } else {
            finish();
            return;
        }
        mRestUntil = System.getTimer() + REST_MS;
        WatchUi.requestUpdate();
    }

    function changeReps(d) {
        mReps += d;
        if (mReps < 0) {
            mReps = 0;
        }
        WatchUi.requestUpdate();
    }

    function changeKg() {
        if (mItems[mIdx]["kg"] == 0) {
            return;
        }
        // Gewicht im Kreis: Ziel −2 bis Ziel +2, zwischen 1 und 20 kg
        var t = target();
        mKg += 1;
        if (mKg > t + 2 || mKg > 20) {
            mKg = t - 2 < 1 ? 1 : t - 2;
        }
        WatchUi.requestUpdate();
    }

    function finish() {
        if (mFinished) {
            return;
        }
        mFinished = true;
        mTimer.stop();
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        if (mDone.size() > 0) {
            Api.call("kbsets", {"plan_id" => mKb["plan_id"], "sets" => mDone}, new Net(["EINHEIT", "GESPEICHERT", mDone.size().toString() + " SÄTZE"]).method(:onReceive));
        }
    }

    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        var w = dc.getWidth();
        var h = dc.getHeight();
        var it = mItems[mIdx];
        var cx = w / 2;

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.17, Graphics.FONT_XTINY, mKb["name"] + (mLighter ? " · LEICHTER" : ""), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.30, Graphics.FONT_SMALL, it["label"] + (it["per_side"] == true ? " JE SEITE" : ""), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.41, Graphics.FONT_XTINY, "SATZ " + mSet + "/" + it["sets"] + " · ÜBUNG " + (mIdx + 1) + "/" + mItems.size(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        var main = mReps.toString() + " × " + (mKg == 0 ? "KÖRPER" : mKg.toString() + " KG");
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.56, Graphics.FONT_LARGE, main, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        dc.setPenWidth(1);
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(w * 0.18, h * 0.68, w * 0.82, h * 0.68);

        var footer = "START: SATZ FERTIG";
        if (mRestUntil > 0) {
            var left = (mRestUntil - System.getTimer()) / 1000;
            if (left < 0) {
                left = 0;
            }
            footer = "PAUSE " + (left / 60).toString() + ":" + (left % 60).format("%02d");
        }
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.76, Graphics.FONT_SMALL, footer, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, h * 0.87, Graphics.FONT_XTINY, "± WDH · MENÜ KG", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}

class KbDelegate extends WatchUi.BehaviorDelegate {
    var mView;

    function initialize(view) {
        BehaviorDelegate.initialize();
        mView = view;
    }

    function onSelect() {
        mView.completeSet();
        return true;
    }

    function onPreviousPage() {
        mView.changeReps(1);
        return true;
    }

    function onNextPage() {
        mView.changeReps(-1);
        return true;
    }

    function onMenu() {
        mView.changeKg();
        return true;
    }

    function onBack() {
        mView.finish();
        return true;
    }
}
