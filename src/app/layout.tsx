import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import "./globals.css";

const heading = Nunito({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading-family" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.defaults.courseSubtitle,
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
