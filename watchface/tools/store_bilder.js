// Erzeugt Store-Icons (500 × 500) und Screenshots (454 × 454, JPG unter 150 KB) für das Garmin-Entwicklerportal.
// Zeichnet mit denselben Routinen wie die Konzeptseite docs/entwurf-zifferblatt.html (window.HC) und der echten Schrift
// Share Tech Mono aus watchface/tools. Alle Werte sind Beispieldaten.
//
// Aufruf im Repo-Hauptordner:  node watchface/tools/store_bilder.js
// Braucht Playwright mit Chromium (in den Claude-Sitzungen vorinstalliert).
// Ergebnis: watchface/store/ und watch/store/ (werden vom Lauf "Uhr-App bauen" in die Upload-Pakete gelegt).

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const FONT = "file://" + path.join(ROOT, "watchface/tools/ShareTechMono-Regular.ttf");
const CONCEPT = "file://" + path.join(ROOT, "docs/entwurf-zifferblatt.html");
const ICON_APP = "file://" + path.join(ROOT, "public/icons/icon-1024.png");
const ICON_BG = "#1B2622"; // Grund des App-Symbols (dunkles Grüngrau, nicht schwarz)

const FACE_OUT = path.join(ROOT, "watchface/store");
const APP_OUT = path.join(ROOT, "watch/store");

// Zifferblatt-Screenshots: Layout, Farbmodus, Anzeige
const FACE_SHOTS = [
  { file: "1-datenraster.jpg", kind: "raster", color: "mono", mode: "active" },
  { file: "2-datenraster-bedeutung.jpg", kind: "raster", color: "meaning", mode: "active" },
  { file: "3-monolith.jpg", kind: "prop", nr: "15", color: "mono" },
  { file: "4-zyklus-spur.jpg", kind: "prop", nr: "17", color: "meaning" },
  { file: "5-stapel.jpg", kind: "prop", nr: "19", color: "mono" },
  { file: "6-eine-zeile.jpg", kind: "prop", nr: "20", color: "mono" },
  { file: "7-immer-an.jpg", kind: "raster", color: "mono", mode: "aod" }
];

async function jpg(page, file, sel) {
  const el = await page.$(sel);
  let q = 90;
  for (;;) {
    await el.screenshot({ path: file, type: "jpeg", quality: q });
    if (fs.statSync(file).size < 150 * 1024 || q <= 50) break;
    q -= 10;
  }
  console.log(path.relative(ROOT, file), Math.round(fs.statSync(file).size / 1024) + " KB");
}

async function faceShots(page) {
  await page.goto(CONCEPT);
  await page.addStyleTag({ content: `@font-face{font-family:"Share Tech Mono";src:url("${FONT}")}
    #shot{position:fixed;left:0;top:0;width:454px;height:454px;background:#000;z-index:99}` });
  await page.evaluate(() => document.fonts.load('20px "Share Tech Mono"'));
  await page.waitForTimeout(300);
  for (const s of FACE_SHOTS) {
    await page.evaluate((s) => {
      const NS = "http://www.w3.org/2000/svg";
      let svg = document.getElementById("shot");
      if (svg) svg.remove();
      svg = document.createElementNS(NS, "svg");
      svg.id = "shot";
      svg.setAttribute("viewBox", "0 0 454 454");
      svg.setAttribute("width", "454");
      svg.setAttribute("height", "454");
      document.body.appendChild(svg);
      const HC = window.HC;
      HC.state.color = s.color;
      HC.state.mode = s.mode || "active";
      if (s.kind === "raster") {
        HC.drawRaster(svg);
        // Gehäusering der Konzeptseite weglassen: Screenshot zeigt nur das Display
        const ring = svg.querySelector("circle");
        if (ring) ring.remove();
      } else {
        HC.el("circle", { cx: 227, cy: 227, r: 227, fill: "#000" }, svg);
        const p = HC.PROPS.find((x) => x.nr === s.nr);
        p.draw(HC.el("g", {}, svg), false);
      }
    }, s);
    await jpg(page, path.join(FACE_OUT, s.file), "#shot");
  }
}

// Uhr-App: Glance in der Glance-Liste und das Menü, nachgezeichnet nach watch/source (GlanceView.mc, MainMenu.mc)
function appHtml(which) {
  const seg = `
  function seg7(g, str, x, top, w, h, t, gap, on, off) {
    var map = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", " ": "" };
    var hv = h / 2, cx = x;
    var pos = { a: [0, 0, w, t], b: [w - t, 0, t, hv + t / 2], c: [w - t, hv - t / 2, t, hv + t / 2], d: [0, h - t, w, t], e: [0, hv - t / 2, t, hv + t / 2], f: [0, 0, t, hv + t / 2], g: [0, hv - t / 2, w, t] };
    str.split("").forEach(function (ch) {
      var lit = map[ch] || "";
      "abcdefg".split("").forEach(function (k) {
        var on1 = lit.indexOf(k) >= 0, p = pos[k];
        g.insertAdjacentHTML("beforeend", '<rect x="' + (cx + p[0]) + '" y="' + (top + p[1]) + '" width="' + p[2] + '" height="' + p[3] + '" fill="' + (on1 ? on : off) + '"/>');
      });
      cx += w + gap;
    });
  }`;
  const glance = `
    <svg id="shot" viewBox="0 0 454 454" width="454" height="454">
      <circle cx="227" cy="227" r="227" fill="#000"/>
      <g font-family="Share Tech Mono" letter-spacing="1">
        <text x="227" y="86" fill="#4A4C51" font-size="20" text-anchor="middle">SCHRITTE  6420</text>
        <rect x="60" y="112" width="334" height="1" fill="#2C2D31"/>
        <text x="66" y="146" fill="#7E8085" font-size="19">TAGESZIEL · VON 45–65 %</text>
        <g id="dg"></g>
        <text x="186" y="226" fill="#7E8085" font-size="19">%</text>
        <text x="214" y="192" fill="#E4E5DF" font-size="21">SCHLAF -8  HRV -10</text>
        <text x="214" y="228" fill="#E4E5DF" font-size="21">BB -2  SYMPTOME -5</text>
        <text x="66" y="276" fill="#E4E5DF" font-size="19">NÄCHSTES: KETTLEBELL 18:00</text>
        <rect x="60" y="300" width="334" height="1" fill="#2C2D31"/>
        <text x="227" y="346" fill="#4A4C51" font-size="20" text-anchor="middle">WETTER  8°</text>
      </g>
    </svg>
    <script>${seg}
      seg7(document.getElementById("dg"), "18", 66, 162, 44, 72, 8, 10, "#E4E5DF", "#2A2B2F");
    </script>`;
  const items = [["HITZEWALLUNG", "24 H: 2"], ["BUFORI BEDARF", "HEUTE 1 · WOCHE 3"], ["CHECK-IN", "3 FRAGEN"], ["HEUTE GEPLANT", "KETTLEBELL 18:00"], ["KETTLEBELL", "WOCHE 3"]];
  const menu = `
    <svg id="shot" viewBox="0 0 454 454" width="454" height="454">
      <circle cx="227" cy="227" r="227" fill="#000"/>
      <text x="227" y="70" fill="#9AA3AE" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="20" text-anchor="middle" letter-spacing="2">HEALTH COACH</text>
      ${items.map((it, i) => {
        const y = 118 + i * 66, sel = i === 1;
        return `${sel ? `<rect x="40" y="${y - 30}" width="374" height="62" rx="10" fill="#1C2026"/>` : ""}
          <text x="227" y="${y}" fill="${sel ? "#F2F4F7" : "#C9CFD6"}" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="${sel ? 26 : 22}" text-anchor="middle">${it[0]}</text>
          <text x="227" y="${y + 24}" fill="#9AA3AE" font-family="Inter, Arial, sans-serif" font-size="17" text-anchor="middle">${it[1]}</text>`;
      }).join("")}
    </svg>`;
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:"Share Tech Mono";src:url("${FONT}")}
    body{margin:0;background:#000}</style>${which === "glance" ? glance : menu}`;
}

async function appShots(page) {
  for (const [which, file] of [["glance", "1-glance.jpg"], ["menu", "2-menue.jpg"]]) {
    await page.setContent(appHtml(which));
    await page.evaluate(() => document.fonts.load('20px "Share Tech Mono"'));
    await page.waitForTimeout(200);
    await jpg(page, path.join(APP_OUT, file), "#shot");
  }
}

// Store-Icons 500 × 500: 10 px Rand, Grund dunkles Grüngrau (Garmin: nicht schwarz, nicht durchsichtig)
async function icons(page) {
  // Uhr-App: das App-Symbol (Ensō), randlos; der Ring hat im Symbol selbst genug Abstand zum Rand
  await page.setContent(`<!doctype html><body style="margin:0">
    <div id="i" style="width:500px;height:500px;background:${ICON_BG}">
    <img src="${ICON_APP}" style="width:500px;height:500px;display:block"></div>`);
  await page.waitForTimeout(200);
  await (await page.$("#i")).screenshot({ path: path.join(APP_OUT, "store-icon-500.png") });
  // Zifferblatt: Monolith-Uhrzeit als rundes Zifferblatt auf dem Grund des App-Symbols
  await page.goto(CONCEPT);
  await page.addStyleTag({ content: `@font-face{font-family:"Share Tech Mono";src:url("${FONT}")}
    #i{position:fixed;left:0;top:0;width:500px;height:500px;background:${ICON_BG};z-index:99;display:flex;align-items:center;justify-content:center}` });
  await page.evaluate(() => document.fonts.load('20px "Share Tech Mono"'));
  await page.evaluate(() => {
    const NS = "http://www.w3.org/2000/svg";
    const d = document.createElement("div");
    d.id = "i";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "-14 -14 482 482");
    svg.setAttribute("width", "480");
    svg.setAttribute("height", "480");
    d.appendChild(svg);
    document.body.appendChild(d);
    const HC = window.HC;
    HC.state.color = "mono";
    HC.state.mode = "active";
    HC.el("circle", { cx: 227, cy: 227, r: 237, fill: "#2A2B2F" }, svg);
    HC.el("circle", { cx: 227, cy: 227, r: 227, fill: "#000" }, svg);
    HC.PROPS.find((x) => x.nr === "15").draw(HC.el("g", {}, svg), false);
  });
  await page.waitForTimeout(200);
  await (await page.$("#i")).screenshot({ path: path.join(FACE_OUT, "store-icon-500.png") });
  console.log("Store-Icons fertig");
}

(async () => {
  fs.mkdirSync(FACE_OUT, { recursive: true });
  fs.mkdirSync(APP_OUT, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("Fehler:", e.message));
  await faceShots(page);
  await appShots(page);
  await icons(page);
  await b.close();
})();
