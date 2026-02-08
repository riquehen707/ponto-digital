import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import SwRegister from "./sw-register";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ponto Vivo",
  description: "Registro de turnos com geolocalizacao e ferramentas da equipe.",
  themeColor: "#e07a5f",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${fraunces.variable}`}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
