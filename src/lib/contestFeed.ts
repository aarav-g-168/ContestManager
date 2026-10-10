import { getContests } from "./getContests";
export async function getContestFeed() {
  try {
    return { contests: await getContests(), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      contests: [],
      error: message.includes("429")
        ? "Our contest provider is busy. Please try again in a few minutes."
        : "We couldn't reach the contest provider. Your saved preferences are safe; please try again shortly.",
    };
  }
}
