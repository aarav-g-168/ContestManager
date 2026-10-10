import { notFound } from "next/navigation";
import EmulatorLogin from "./EmulatorLogin";

// Available only in the isolated emulator preview, never in a production build.
export default function ProfileTestPage() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "true") notFound();
  return <EmulatorLogin />;
}
