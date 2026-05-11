import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Agent Email — AI Outbound Research Agent for B2B Sales Teams",
    template: "%s · Agent Email",
  },
  description:
    "Agent Email is the AI agent that researches every B2B prospect on the open web, builds a live company dossier, and drafts a personalized cold email — with the exact moment to send it. Built for founders, SDRs, and revenue teams who refuse to send generic outbound.",
  keywords: [
    "AI cold email",
    "AI email agent",
    "AI outbound",
    "B2B sales agent",
    "prospect research automation",
    "personalized cold email AI",
    "SDR automation",
    "company research AI",
    "AI sales agent",
    "LangGraph agent",
    "cold email personalization",
    "ICP research tool",
    "outbound prospecting AI",
  ],
  authors: [{ name: "Agent Email" }],
  creator: "Agent Email",
  openGraph: {
    type: "website",
    title: "Agent Email — AI Outbound Research Agent for B2B Sales Teams",
    description:
      "Cold email that reads like you actually did your homework. Agent Email researches every prospect, builds a live dossier, and drafts a personalized email with the right moment to send it.",
    siteName: "Agent Email",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Email — AI Outbound Research Agent for B2B Sales Teams",
    description:
      "Cold email that reads like you actually did your homework. Live dossier + personalized draft in under a minute.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
