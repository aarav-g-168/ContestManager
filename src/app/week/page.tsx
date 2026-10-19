import type { Metadata } from "next";
import MyWeek from "@/features/week/components/MyWeek";
import { getContestFeed } from "@/features/contests/server/feed";
export const metadata: Metadata = {
  title: "My week",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function WeekPage() {
  const { contests, error } = await getContestFeed();
  const initialNow = new Date().getTime();
  return (
    <MyWeek contests={contests} feedError={error} initialNow={initialNow} />
  );
}
