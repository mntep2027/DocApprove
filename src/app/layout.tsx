import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const suisseIntl = localFont({
  src: [
    { path: "./fonts/SuisseIntl-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/SuisseIntl-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SuisseIntl-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/SuisseIntl-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-suisse",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "DocApprove",
  description: "Share documents between companies and manage approvals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${suisseIntl.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
