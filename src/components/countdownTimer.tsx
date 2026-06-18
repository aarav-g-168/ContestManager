"use client";

import { useEffect, useState } from "react";
import { parseAsUTC } from "@/lib/date";

interface CountdownTimerProps {
  startTime: string;
}

export default function CountdownTimer({
  startTime,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference =
        parseAsUTC(startTime).getTime() - Date.now();

      if (difference > 0) {
        const days = Math.floor(
          difference / (1000 * 60 * 60 * 24)
        );

        const hours = Math.floor(
          (difference / (1000 * 60 * 60)) % 24
        );

        const minutes = Math.floor(
          (difference / 1000 / 60) % 60
        );

        const seconds = Math.floor(
          (difference / 1000) % 60
        );

        let timerString = "";

        if (days > 0)
          timerString += `${days}d `;

        if (hours > 0 || days > 0)
          timerString += `${hours}h `;

        timerString += `${minutes}m ${seconds}s`;

        setTimeLeft(timerString);
      } else {
        setTimeLeft("Started!");
      }
    };

    calculateTimeLeft();

    const timer = setInterval(
      calculateTimeLeft,
      1000
    );

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <span className="text-sm font-semibold text-indigo-600">
      {timeLeft}
    </span>
  );
}