import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Inter is the brand typeface (assets/brand/brand.md).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nilya Admin",
    template: "%s · Nilya Admin",
  },
  description: "Moderation and operations for the Nilya marketplace.",
  icons: { icon: "/nilya-favicon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
