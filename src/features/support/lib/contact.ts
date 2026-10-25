export const SUPPORT_EMAIL = "guptaaarav987@gmail.com";
export const PUBLIC_ORIGIN = "https://contest-manager.vercel.app";
export const FEEDBACK_CATEGORIES = [
  "bug",
  "suggestion",
  "account",
  "other",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackMessage = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  email?: string | null;
};
