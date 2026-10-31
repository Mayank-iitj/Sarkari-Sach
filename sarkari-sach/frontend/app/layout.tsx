import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "सरकारी सच (Sarkari Sach) — Official Government Claim Verifier",
  description: "Verify government claims, viral circulars, deadlines and notices against primary official sources.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi">
      <body className="min-h-screen flex flex-col bg-canvas text-ink antialiased">
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}

