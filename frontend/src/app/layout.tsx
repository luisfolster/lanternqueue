import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LanternQueue | Gestão de suporte de TI",
  description: "Aplicação para registrar, acompanhar e resolver solicitações de suporte de TI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
