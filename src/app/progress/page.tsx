import type { Metadata } from "next";
import ProgressDashboard from "@/features/progress/components/ProgressDashboard";
export const metadata: Metadata = {
  title: "Progress",
  robots: { index: false, follow: false },
};
export default function ProgressPage() {
  return <ProgressDashboard />;
}
