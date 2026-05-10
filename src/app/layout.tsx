import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GmbH-Kalkulator",
  description: "Vermögensaufbau via GmbH – Berechnung von Gründung, Betrieb und Auszahlungsphase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
