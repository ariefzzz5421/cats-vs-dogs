import type { Metadata } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./classic-game.css";

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

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Cats vs Dogs — Backyard Rumble",
    description: "A modern 2D turn-based backyard throwing game inspired by classic browser artillery games.",
    openGraph: {
      title: "Cats vs Dogs — Backyard Rumble",
      description: "Pick a fighter. Read the wind. Charge the throw. Rule the backyard.",
      images: [{ url: `${origin}/og.webp`, width: 1400, height: 933, alt: "Cats and dogs face off across a backyard wall" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Cats vs Dogs — Backyard Rumble",
      description: "Pick a fighter. Read the wind. Charge the throw. Rule the backyard.",
      images: [`${origin}/og.webp`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${jakarta.variable} ${jetbrains.variable}`}>{children}</body></html>;
}
