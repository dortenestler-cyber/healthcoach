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
    background_color: "#f5f5f4",
    theme_color: "#a3234f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
