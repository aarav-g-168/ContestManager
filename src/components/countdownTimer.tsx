"use client";
import { useEffect, useState } from "react";
import { parseAsUTC } from "@/lib/date";
export default function CountdownTimer({
  startTime,
  expanded = false,
}: {
  startTime: string;
  expanded?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState("Upcoming");
  const [units, setUnits] = useState<string[] | null>(null);
  useEffect(() => {
    const update = () => {
      const difference = parseAsUTC(startTime).getTime() - Date.now();
      if (!Number.isFinite(difference)) {
        setTimeLeft("Upcoming");
        setUnits(null);
        return;
      }
      if (difference <= 0) {
        setTimeLeft("Started");
        setUnits(null);
        return;
      }
      const days = Math.floor(difference / 86400000),
        hours = Math.floor(difference / 3600000) % 24,
        minutes = Math.floor(difference / 60000) % 60;
      setUnits(
        [days, hours, minutes].map((value) => String(value).padStart(2, "0")),
      );
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
  if (expanded && timeLeft === "Started")
    return (
      <p className="text-primary text-lg font-medium">This round has started</p>
    );
  if (expanded)
    return (
      <div
        className="countdown-expanded"
        role="timer"
        aria-live="off"
        aria-label={timeLeft === "Upcoming" ? "Loading start time" : timeLeft}
      >
        {["Days", "Hours", "Minutes"].map((label, index) => (
          <div key={label} aria-hidden="true">
            <strong>{units?.[index] ?? "—"}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  return (
    <span className="font-mono text-[10px] tabular-nums text-primary">
      {timeLeft}
    </span>
  );
}
