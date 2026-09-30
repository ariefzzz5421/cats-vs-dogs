import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Lilita_One } from "next/font/google";
import "./globals.css";
import "./rumble.css";
import "./enhanced.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});
const lilita = Lilita_One({
  variable: "--font-arcade",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: "Cats vs Dogs — Backyard Rumble",
  description:
    "A modern 2D turn-based backyard throwing game inspired by classic browser artillery games.",
  openGraph: {
    title: "Cats vs Dogs — Backyard Rumble",
    description:
      "Hold to charge. Release to throw. Watch the wind. Rule the backyard.",
    images: [
      {
        url: "/og.png",
        width: 1280,
        height: 800,
        alt: "Cats and dogs face off across a backyard wall",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cats vs Dogs — Backyard Rumble",
    description:
      "Hold to charge. Release to throw. Watch the wind. Rule the backyard.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${lilita.variable}`}>
        {children}
      </body>
    </html>
  );
}
