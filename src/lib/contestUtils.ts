import { Contest } from "../types/contest";

export function filterContestsByDays(contests: Contest[], days: number) {
  const now = new Date();
  const future = new Date();

  future.setDate(now.getDate() + days);

  return contests.filter((contest) => {
    const start = new Date(contest.start);
    return start >= now && start <= future;
  });
}

export function sortContests(contests: Contest[]) {
  return contests.sort(
    (a, b) =>
      new Date(a.start).getTime() -
      new Date(b.start).getTime()
  );
}

export function limitContests(contests: Contest[], limit: number) {
  return contests.slice(0, limit);
}

export function getHomePageContests(contests: Contest[]) {
  return limitContests(
    sortContests(
      filterContestsByDays(contests, 7)
    ),
    8
  );
}