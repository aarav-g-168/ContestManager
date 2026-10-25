import type { Metadata } from "next";
import LegalPage from "@/features/support/components/LegalPage";
export const metadata: Metadata = { title: "Terms" };
export default function Page() {
  return <LegalPage kind="terms" />;
}
