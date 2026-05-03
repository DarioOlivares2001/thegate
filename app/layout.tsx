import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { buildThemeCssProperties } from "@/lib/store-settings/buildThemeCssProperties";
import { getStoreSettings } from "@/lib/store-settings/getStoreSettings";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: {
      default: settings.store_name,
      template: `%s | ${settings.store_name}`,
    },
    description: settings.store_tagline || "La mejor experiencia de compra online del país.",
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settingsPromise = getStoreSettings();

  return (
    <html lang="es">
      <BodyWithTheme
        interClass={inter.variable}
        displayClass={spaceGrotesk.variable}
        settingsPromise={settingsPromise}
      >
        {children}
      </BodyWithTheme>
    </html>
  );
}

async function BodyWithTheme({
  interClass,
  displayClass,
  settingsPromise,
  children,
}: {
  interClass: string;
  displayClass: string;
  settingsPromise: ReturnType<typeof getStoreSettings>;
  children: React.ReactNode;
}) {
  const settings = await settingsPromise;
  const themeVars = buildThemeCssProperties(settings);

  return (
    <body style={themeVars} className={`${interClass} ${displayClass} antialiased`}>
      {children}
    </body>
  );
}
