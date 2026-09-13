import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./rumble.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
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
      <body className={`${jakarta.variable} ${jetbrains.variable}`}>
        {children}
      </body>
    </html>
  );
}
