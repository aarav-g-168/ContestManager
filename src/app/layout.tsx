import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { Toaster } from "sonner";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: {
    default: "Contest Manager — Less searching. More competing.",
    template: "%s | Contest Manager",
  },
  description:
    "Your competitive programming calendar, in one place. Discover upcoming contests, save your shortlist, and show up ready with email reminders.",
  icons: { icon: "/coding.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <Navbar />
            <main id="main-content" className="site-main" tabIndex={-1}>
              {children}
            </main>
            <SiteFooter />
            <Toaster richColors position="bottom-right" closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
