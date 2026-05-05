import type { Metadata } from "next";
import { Anek_Latin, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const anek = Anek_Latin({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-anek-latin" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Tradyon Procurement",
  description: "Every vendor quote, captured. Every market move, surfaced. Every buying decision, sharper.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.DEMO_MODE === "1";
  const html = (
    <html lang="en" className={`${anek.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
  if (isDemo) return html;
  return <ClerkProvider>{html}</ClerkProvider>;
}
