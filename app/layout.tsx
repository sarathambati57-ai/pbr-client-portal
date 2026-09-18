import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PBR Client Portal",
  description: "Client approval portal for PBR Digital Services",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
