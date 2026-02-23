import type { Metadata } from "next";
import { Inter, VT323 } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import GlobalBackground from "@/components/GlobalBackground";

const inter = Inter({ subsets: ["latin"] });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });

export const metadata: Metadata = {
  title: "SiteTerminal",
  description: "Terminal-style website inspector — headers, DNS, TLS, security analysis, tech fingerprinting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${vt323.variable} bg-zinc-950 text-zinc-100 min-h-screen relative`}>
        <GlobalBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
