import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GmbH-Kalkulator",
    short_name: "GmbHCalc",
    description: "Vermögensaufbau via GmbH – Berechnung von Gründung, Betrieb und Auszahlungsphase",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
