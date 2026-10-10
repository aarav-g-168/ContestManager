export function getPlatformKey(host: string) {
  return host
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

export function getPlatform(host: string) {
  const key = getPlatformKey(host);
  const platforms: Record<
    string,
    { name: string; mark: string; color: string }
  > = {
    "codeforces.com": { name: "Codeforces", mark: "Cf", color: "#7ba9e6" },
    "codechef.com": { name: "CodeChef", mark: "Cc", color: "#bb956d" },
    "leetcode.com": { name: "LeetCode", mark: "Lc", color: "#d99c36" },
    "atcoder.jp": { name: "AtCoder", mark: "At", color: "#988bc9" },
    "hackerearth.com": { name: "HackerEarth", mark: "He", color: "#709ada" },
    "hackerrank.com": { name: "HackerRank", mark: "Hr", color: "#56ad7d" },
    "geeksforgeeks.org": {
      name: "GeeksforGeeks",
      mark: "Gf",
      color: "#69aa7b",
    },
    "topcoder.com": { name: "Topcoder", mark: "Tc", color: "#be84b8" },
    "ctftime.org": { name: "CTFtime", mark: "Ct", color: "#d68b73" },
  };
  return (
    platforms[key] ?? {
      name: key.replace(/\.(com|org|io|jp)$/, ""),
      mark: key.slice(0, 2).toUpperCase(),
      color: "var(--primary)",
    }
  );
}
