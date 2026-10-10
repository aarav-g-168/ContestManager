"use client";
import { useEffect, useState } from "react";
import { parseAsUTC } from "@/lib/date";
export default function CountdownTimer({ startTime }: { startTime: string }) {
  const [timeLeft, setTimeLeft] = useState("Upcoming");
  useEffect(() => {
    const update = () => {
      const difference = parseAsUTC(startTime).getTime() - Date.now();
      if (!Number.isFinite(difference)) {
        setTimeLeft("Upcoming");
        return;
      }
      if (difference <= 0) {
        setTimeLeft("Started");
        return;
      }
      const days = Math.floor(difference / 86400000),
        hours = Math.floor(difference / 3600000) % 24,
        minutes = Math.floor(difference / 60000) % 60;
      setTimeLeft(
        days > 0
          ? `In ${days}d ${hours}h`
          : hours > 0
            ? `In ${hours}h ${minutes}m`
            : `In ${minutes}m ${Math.floor(difference / 1000) % 60}s`,
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime]);
  return (
    <span className="font-mono text-[10px] tabular-nums text-primary">
      {timeLeft}
    </span>
  );
}
