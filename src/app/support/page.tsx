import type { Metadata } from "next";
import Support from "@/features/support/components/Support";
export const metadata: Metadata = {
  title: "Help & feedback",
  description:
    "Get help with Contest Manager, reminder delivery and your account.",
};
export default function Page() {
  return <Support />;
}
