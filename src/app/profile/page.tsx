import ProfileContent from "@/components/profileContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your workspace" };

export default function ProfilePage() {
  return <ProfileContent />;
}
