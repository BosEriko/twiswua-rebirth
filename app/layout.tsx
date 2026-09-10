import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tiger Tide — A tiny tiger. A whole lot of ducks.",
  description:
    "Follow your instinct. Survive the flock. A mouse-controlled jungle roguelite.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
