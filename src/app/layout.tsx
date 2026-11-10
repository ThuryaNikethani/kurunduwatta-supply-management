import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Sans_Sinhala } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const sinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "කුරුඳුවත්ත බඩු ලැයිස්තු",
  description: "කුරුඳුවත්ත විලා කුස්සියට ඕන බඩු අනුමත කරගන්න",
  appleWebApp: { capable: true, title: "බඩු ලැයිස්තු", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
};

export const viewport: Viewport = {
  themeColor: "#13281b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="si">
      <body
        className={`${cormorant.variable} ${inter.variable} ${sinhala.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
