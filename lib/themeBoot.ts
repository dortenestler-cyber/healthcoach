// Ohne "use client": wird im Seitenkopf (layout.tsx) als Skript eingebettet.
// Setzt die gewählte Darstellung vor dem ersten Zeichnen, damit nichts hell aufblitzt.
export const THEME_KEY = "hc_theme";
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
