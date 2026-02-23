import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SiteTerminal",
  description: "Terminal-style website inspector — headers, DNS, TLS, security analysis, tech fingerprinting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
