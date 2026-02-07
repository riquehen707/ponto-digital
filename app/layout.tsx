import "./globals.css";
import { Fraunces, Sora } from "next/font/google";

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

export const metadata = {
  title: "Ponto Vivo",
  description: "Registro de turnos com geolocalizacao e ferramentas da equipe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
