import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ponto Vivo",
    short_name: "Ponto Vivo",
    description: "Ponto digital com geolocalizacao e escala da equipe.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f6f4",
    theme_color: "#ff7a59",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
