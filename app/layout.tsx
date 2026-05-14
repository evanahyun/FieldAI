import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SupabaseEnvBanner } from "@/components/layout/SupabaseEnvBanner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FieldAI — AI front desk for field service",
  description:
    "AI-qualified leads from phone calls for plumbing, trenchless sewer, HVAC, and blue-collar field service teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-white font-sans antialiased`}>
        <SupabaseEnvBanner />
        {children}
      </body>
    </html>
  );
}
