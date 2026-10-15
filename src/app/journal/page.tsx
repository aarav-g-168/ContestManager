import type { Metadata } from "next";
import ContestJournal from "@/components/ContestJournal";
export const metadata: Metadata = {
  title: "Contest journal",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default function JournalPage() {
  const initialNow = new Date().getTime();
  return <ContestJournal initialNow={initialNow} />;
}
