import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UPI for Mom",
  description: "Ask someone you trust to pay a UPI QR code for you.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen mx-auto max-w-md">{children}</div>
      </body>
    </html>
  );
}
