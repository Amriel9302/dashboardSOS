import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS Telas | CRM",
  description: "Dashboard comercial e de anúncios da SOS Telas de Proteção",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
