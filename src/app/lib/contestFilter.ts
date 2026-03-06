import { Contest } from "../types/contest";

const DAYS_LIMIT = 7;
const MAX_CONTESTS = 6;

export function getHomePageContests(contests: Contest[]): Contest[] {
  const now = new Date();

  const future = new Date();
  future.setDate(now.getDate() + DAYS_LIMIT);

  return contests
    .filter((contest) => {
      const startTime = new Date(contest.start);
      return startTime >= now && startTime <= future;
    })
    .sort(
      (a, b) =>
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
    )
    .slice(0, MAX_CONTESTS);
}