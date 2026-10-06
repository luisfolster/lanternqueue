import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LanternQueue",
  description: "IT Service Management Platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
