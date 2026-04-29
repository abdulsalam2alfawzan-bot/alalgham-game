import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "الألغام",
  description: "لعبة عربية سريعة للفرق",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
