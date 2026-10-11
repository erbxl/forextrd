import type { Metadata } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { LearningProvider } from "@/components/learning-provider";

export const metadata: Metadata = { title: { default: "Tu espacio | Forex Academy Pro", template: "%s | Forex Academy Pro" }, description: "Aprende Forex desde los fundamentos, demuestra lo que sabes y construye criterio. Academia educativa local en español.", robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><body><LearningProvider><AppShell>{children}</AppShell></LearningProvider></body></html>;
}
