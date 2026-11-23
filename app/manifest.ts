import type { MetadataRoute } from "next";

// Damit lässt sich Health Coach wie eine App auf den Startbildschirm legen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Health Coach",
    short_name: "Health Coach",
    description: "Training, Erholung und Perimenopause in einer App",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d10", // Startbild dunkel (immer dunkel)
    theme_color: "#0b0d10",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
