import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlteraFlux | Plateforme Universelle de Conversion Asynchrone",
  description: "Convertisseur universel ultra-rapide de vidéos, audios, images, documents et code (AST & IA). Traitement asynchrone découplé et sécurisé.",
  keywords: ["conversion vidéo", "transcodage mp4 mp3", "pandoc pdf", "webp avif", "transpilation code", "alteraflux"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#eef2f6] text-slate-800 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
