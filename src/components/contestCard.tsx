"use client";

import { useState, useEffect, useRef } from "react";
import type { Contest } from "@/types/contest";
import { parseAsUTC } from "@/lib/date";
import CountdownTimer from "./countdownTimer";

import {
  Bookmark,
  MoreVertical,
  Bell,
} from "lucide-react";

// formatDuration
const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return "bhenchod";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  let result = '';
  if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
  if (minutes > 0) result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return result.trim() || "Less than a minute";
};

// formatStartTime
const formatStartTime = (utcDateString: string): string => {
  const date = parseAsUTC(utcDateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
};

interface ContestCardProps {
  contest: Contest;

  isBookmarked: boolean;
  onBookmarkToggle: (contest: Contest) => void;

  hasReminder: boolean;

  reminderType?: "1h" | "6h" | "24h";

  onReminderSet: (
    contest: Contest,
    reminderType: "1h" | "6h" | "24h"
  ) => void;
}

export default function ContestCard({
  contest,
  isBookmarked,
  onBookmarkToggle,
  hasReminder,
  reminderType,
  onReminderSet,
}: ContestCardProps) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // three dots menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
        setShowReminderOptions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const platformLogos: { [key: string]: string } = {
    'codeforces.com': 'https://sta.codeforces.com/s/94338/images/codeforces-logo-with-text.png',
    'leetcode.com': 'https://leetcode.com/static/images/LeetCode_logo_rvs.png',
    'atcoder.jp': 'https://img.atcoder.jp/assets/atcoder.png',
    'topcoder.com': 'https://images.ctfassets.net/b5f1djy59z3a/4Fk4Ie7L62lhw52mKnA007/a9582587597c366432a233b62f5f9999/Topcoder_Logo_2021.svg',
    'codingninjas.com/codestudio': 'https://files.codingninjas.in/cn-logo-dark-9826.svg',
    'hackerearth.com': 'https://static-fastly.hackerearth.com/static/he-logo-new.svg',
    'geeksforgeeks.org': 'https://media.geeksforgeeks.org/wp-content/cdn-uploads/20210420155809/gfg-new-logo.png',
    'codechef.com': 'https://cdn.codechef.com/images/cc-logo.svg',
  };

  const logoUrl = platformLogos[contest.host] || `https://placehold.co/100x40/f0f0f0/333?text=${contest.host.split('.')[0]}`;

  const [showReminderOptions, setShowReminderOptions] = useState(false);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 group min-h-[48px]">
      <div className="p-2 flex-grow">
        <div className="flex items-start justify-between mb-4">
          <img
            src={logoUrl}
            alt={`${contest.host} logo`}
            className="h-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src =
                `https://placehold.co/100x40/f0f0f0/333?text=${contest.host.split(".")[0]}`;
            }}
          />

          <div className="flex items-center gap-2">

            {hasMounted ? (
              <CountdownTimer startTime={contest.start} />
            ) : (
              <span className="text-sm font-semibold text-indigo-600">
                Loading...
              </span>
            )}

            <div
              className="relative"
              ref={menuRef}
            >
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50">

                  <button
                    onClick={() => {
                      onBookmarkToggle(contest);
                      setMenuOpen(false);
                      setShowReminderOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <Bookmark className="h-4 w-4" />
                    {isBookmarked ? "Remove Bookmark" : "Bookmark"}
                  </button>

                  <button
                    onClick={() => {
                      setShowReminderOptions(!showReminderOptions)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <Bell className="h-4 w-4" />

                    {hasReminder
                      ? `🔔 ${reminderType} Reminder Active`
                      : "Set Reminder"}
                  </button>

                  {showReminderOptions && (
                    <>
                      <button
                        onClick={() => {
                          onReminderSet(contest, "1h");
                          setShowReminderOptions(false);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-8 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        1 hour before
                      </button>

                      <button
                        onClick={() => {
                          onReminderSet(contest, "6h");
                          setShowReminderOptions(false);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-8 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        6 hours before
                      </button>

                      <button
                        onClick={() => {
                          onReminderSet(contest, "24h");
                          setShowReminderOptions(false);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-8 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        24 hours before
                      </button>
                    </>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 leading-tight min-h-[48px]">{contest.event}</h3>
        <div className="text-sm text-gray-700 dark:text-gray-400 space-y-1">
          <p><strong>Starts : </strong>
            {/*HYDRATION FIX....HTML rendered on the server != React renders on the client*/}
            {hasMounted
              ? formatStartTime(contest.start)
              : (contest.formattedStartIST ?? '...')
            }
          </p>
          <p><strong>Duration : </strong> {formatDuration(contest.duration)}</p>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-zinc-900 p-4">
        <a
          href={contest.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
        >
          Go to Contest
        </a>
      </div>
    </div>
  );
};