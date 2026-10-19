import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { ProfileProvider } from "@/features/profile/components/ProfileProvider";
import Navbar from "@/components/layout/Navbar";
import SiteFooter from "@/components/layout/SiteFooter";
import Notifications from "@/components/feedback/Notifications";
const plexSans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Contest Manager — Competitive programming calendar",
    template: "%s | Contest Manager",
  },
  description:
    "Find upcoming programming contests across Codeforces, LeetCode, AtCoder and more. Save contests, set email reminders, and add events to Google Calendar.",
  icons: { icon: "/coding.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <ProfileProvider>
              <a className="skip-link" href="#main-content">
                Skip to content
              </a>
              <Navbar />
              <main id="main-content" className="site-main" tabIndex={-1}>
                {children}
              </main>
              <SiteFooter />
              <Notifications />
            </ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
