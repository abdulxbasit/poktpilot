import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketPilot | Learn blockchain RPC with Pocket",
  description:
    "An interactive RPC learning playground built around Pocket Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
