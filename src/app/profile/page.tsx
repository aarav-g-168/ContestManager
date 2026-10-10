import ProfileContent from "@/components/profileContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileContent />;
}
