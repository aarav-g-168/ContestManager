export interface ProfileValues {
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  organization: string;
  website: string;
  github: string;
  linkedin: string;
  x: string;
  codeforces: string;
  leetcode: string;
  atcoder: string;
  codechef: string;
}
export type ProfileField = keyof ProfileValues;
export type ProfileErrors = Partial<Record<ProfileField, string>>;
export type AvatarAction = "keep" | "remove" | "google";
export interface SavedProfile {
  values: ProfileValues;
  avatarMode: "google" | "custom" | "none";
  revision: number;
  updatedAt: string | null;
}
export const profileLimits: Record<ProfileField, number> = {
  displayName: 60,
  headline: 80,
  bio: 300,
  location: 80,
  organization: 100,
  website: 200,
  github: 200,
  linkedin: 200,
  x: 200,
  codeforces: 40,
  leetcode: 40,
  atcoder: 40,
  codechef: 40,
};
export function emptyProfile(displayName = ""): ProfileValues {
  return {
    displayName,
    headline: "",
    bio: "",
    location: "",
    organization: "",
    website: "",
    github: "",
    linkedin: "",
    x: "",
    codeforces: "",
    leetcode: "",
    atcoder: "",
    codechef: "",
  };
}
export function normalizeProfile(input: unknown, fallbackName = "") {
  const raw =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const values = emptyProfile(fallbackName);
  for (const key of Object.keys(values) as ProfileField[]) {
    if (typeof raw[key] === "string") values[key] = raw[key].trim();
  }
  for (const key of ["website", "github", "linkedin", "x"] as const) {
    if (values[key] && !/^[a-z][a-z\d+.-]*:/i.test(values[key]))
      values[key] = `https://${values[key]}`;
    try {
      if (values[key]) values[key] = new URL(values[key]).toString();
    } catch {
      /* Retain invalid input for inline validation. */
    }
  }
  return values;
}
export function validateProfile(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!values.displayName.trim())
    errors.displayName = "Enter the name you’d like to use.";
  for (const key of Object.keys(values) as ProfileField[]) {
    if (values[key].length > profileLimits[key])
      errors[key] = `Keep this under ${profileLimits[key]} characters.`;
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(values[key]))
      errors[key] = "Remove unsupported characters.";
  }
  for (const key of ["website", "github", "linkedin", "x"] as const) {
    if (!values[key]) continue;
    try {
      const url = new URL(values[key]);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        /\s/.test(values[key]) ||
        !url.hostname.includes(".")
      )
        throw new Error();
      const host = url.hostname.replace(/^www\./, "");
      if (
        key === "github" &&
        (host !== "github.com" || !/^\/[a-z\d-]+\/?$/i.test(url.pathname))
      )
        errors[key] =
          "Use your GitHub profile URL, such as github.com/yourname.";
      if (
        key === "linkedin" &&
        (host !== "linkedin.com" || !/^\/in\/[^/]+\/?$/.test(url.pathname))
      )
        errors[key] =
          "Use your LinkedIn profile URL, such as linkedin.com/in/yourname.";
      if (
        key === "x" &&
        (!["x.com", "twitter.com"].includes(host) ||
          !/^\/[a-z\d_]+\/?$/i.test(url.pathname))
      )
        errors[key] = "Use your X profile URL, such as x.com/yourname.";
    } catch {
      errors[key] = "Enter a valid HTTPS link, such as https://example.com.";
    }
  }
  for (const key of [
    "codeforces",
    "leetcode",
    "atcoder",
    "codechef",
  ] as const) {
    if (values[key] && !/^[a-z\d_.-]+$/i.test(values[key]))
      errors[key] =
        "Enter just your handle using letters, numbers, dots, hyphens, or underscores.";
  }
  return errors;
}
export function codingProfileUrl(
  platform: "codeforces" | "leetcode" | "atcoder" | "codechef",
  handle: string,
) {
  const prefixes = {
    codeforces: "https://codeforces.com/profile/",
    leetcode: "https://leetcode.com/u/",
    atcoder: "https://atcoder.jp/users/",
    codechef: "https://www.codechef.com/users/",
  };
  return `${prefixes[platform]}${encodeURIComponent(handle)}`;
}
