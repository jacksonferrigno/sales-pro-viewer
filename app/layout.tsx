import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sales intelligence — ServeLine",
  description:
    "Call transcript insights and restaurant prep for outbound sales teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
