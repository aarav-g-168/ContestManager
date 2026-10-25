import type { Metadata } from "next";
import LegalPage from "@/features/support/components/LegalPage";
export const metadata: Metadata = { title: "Privacy" };
export default function Page() {
  return <LegalPage kind="privacy" />;
}
