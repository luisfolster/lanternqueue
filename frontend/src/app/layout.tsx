import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LanternQueue | Gestão de suporte de TI",
  description: "Plataforma de gestão de suporte de TI em desenvolvimento.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
