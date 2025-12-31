import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

/**
 * Inter font configuration
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

/**
 * Metadata for the LXUSD Wallet application
 */
export const metadata: Metadata = {
  title: "LXUSD Wallet",
  description: "XRPL EVM Wallet - Send and receive tokens seamlessly",
  icons: {
    icon: [{ url: "/lxusd-logo.svg", type: "image/svg+xml" }],
    apple: "/lxusd-logo.svg",
    shortcut: "/lxusd-logo.svg",
  },
};

/**
 * Root layout component with MetaKeep SDK script
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* MetaKeep SDK script */}
        <Script
          src="https://cdn.jsdelivr.net/npm/metakeep@2.2.8/lib/index.js"
          integrity="sha256-dVJ6hf8zqdtHxHJCDJnLAepAyCCbu6lCXzZS3lqMIto="
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
