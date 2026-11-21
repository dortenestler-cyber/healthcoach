import Toybox.Graphics;
import Toybox.Lang;

// Kantige Icons aus Rechtecken und Vielecken, Größe s (etwa Schrifthöhe)
module Icons {

    function draw(dc, name, x, y, s) {
        var u = s / 8.0;
        if (name.equals("bb")) {
            // Batterie mit Pol
            dc.drawRectangle(x, y + u, u * 7, u * 6);
            dc.fillRectangle(x + u * 7, y + u * 3, u, u * 2);
            dc.fillRectangle(x + u * 1.5, y + u * 2.5, u * 4, u * 3);
        } else if (name.equals("cycle")) {
            // Achteck mit Markierung
            dc.fillPolygon([[x + u * 2.5, y], [x + u * 5.5, y], [x + u * 8, y + u * 2.5], [x + u * 8, y + u * 5.5], [x + u * 5.5, y + u * 8], [x + u * 2.5, y + u * 8], [x, y + u * 5.5], [x, y + u * 2.5]]);
            dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(x + u * 2, y + u * 2, u * 4, u * 4);
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(x + u * 5, y + u * 1, u * 2, u * 2);
        } else if (name.equals("sun")) {
            dc.fillRectangle(x + u * 2.5, y + u * 2.5, u * 3, u * 3);
            dc.fillRectangle(x + u * 3.5, y, u, u * 1.5);
            dc.fillRectangle(x + u * 3.5, y + u * 6.5, u, u * 1.5);
            dc.fillRectangle(x, y + u * 3.5, u * 1.5, u);
            dc.fillRectangle(x + u * 6.5, y + u * 3.5, u * 1.5, u);
        } else if (name.equals("cloud")) {
            dc.fillRectangle(x + u * 2, y + u * 2, u * 4, u * 2);
            dc.fillRectangle(x, y + u * 4, u * 8, u * 3);
        } else if (name.equals("drop")) {
            dc.fillPolygon([[x + u * 4, y], [x + u * 7, y + u * 4], [x + u * 7, y + u * 6], [x + u * 5.5, y + u * 8], [x + u * 2.5, y + u * 8], [x + u, y + u * 6], [x + u, y + u * 4]]);
        } else if (name.equals("heart")) {
            dc.fillPolygon([[x, y + u * 2], [x + u * 2, y], [x + u * 4, y + u * 2], [x + u * 6, y], [x + u * 8, y + u * 2], [x + u * 8, y + u * 4], [x + u * 4, y + u * 8], [x, y + u * 4]]);
        } else if (name.equals("steps")) {
            dc.fillRectangle(x, y + u * 3, u * 3, u * 5);
            dc.fillRectangle(x + u * 5, y, u * 3, u * 5);
        } else if (name.equals("bell")) {
            dc.fillPolygon([[x + u * 2, y + u], [x + u * 6, y + u], [x + u * 7, y + u * 6], [x + u, y + u * 6]]);
            dc.fillRectangle(x + u * 3, y + u * 6.5, u * 2, u * 1.5);
        } else if (name.equals("kb")) {
            // Kettlebell: Griff und Körper
            dc.drawRectangle(x + u * 2, y, u * 4, u * 3);
            dc.fillPolygon([[x + u, y + u * 3], [x + u * 7, y + u * 3], [x + u * 8, y + u * 5], [x + u * 7, y + u * 8], [x + u, y + u * 8], [x, y + u * 5]]);
        } else if (name.equals("inhaler")) {
            dc.fillRectangle(x + u * 2.5, y, u * 3, u * 4);
            dc.fillRectangle(x + u, y + u * 3.5, u * 6, u * 4.5);
            dc.fillRectangle(x + u * 7, y + u * 5.5, u, u * 2.5);
        }
    }
}
