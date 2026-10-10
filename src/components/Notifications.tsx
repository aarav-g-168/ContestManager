"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export default function Notifications() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      richColors
      position="bottom-right"
      closeButton
    />
  );
}
