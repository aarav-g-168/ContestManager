import type { Metadata } from "next";
import AccountSettings from "@/features/account/components/AccountSettings";
export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};
export default function SettingsPage() {
  return <AccountSettings />;
}
