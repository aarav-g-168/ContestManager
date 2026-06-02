'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Contest } from '../types/contest';
import { parseAsUTC } from '@/lib/date';

import { Check, ChevronsUpDown } from "lucide-react";
import { Bookmark } from "lucide-react";

import { Button } from "./ui/button";

import { useBookmarks } from "@/hooks/bookmarks";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return "bhenchod";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  let result = '';
  if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
  if (minutes > 0) result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return result.trim() || "Less than a minute";
};

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

const CountdownTimer = ({ startTime }: { startTime: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = parseAsUTC(startTime).getTime() - Date.now();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        let timerString = '';
        if (days > 0) timerString += `${days}d `;
        if (hours > 0 || days > 0) timerString += `${hours}h `;
        timerString += `${minutes}m ${seconds}s`;

        setTimeLeft(timerString);
      } else {
        setTimeLeft('Started!');
      }
    };

    calculateTimeLeft();

    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="text-sm font-semibold text-indigo-600">{timeLeft}</span>;
};

const ContestCard = ({
  contest,
  isBookmarked,
  onBookmarkToggle,
}: ContestCardProps) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
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
                `https://placehold.co/100x40/f0f0f0/333?text=${contest.host.split('.')[0]}`;
            }}
          />

          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-indigo-600">
              {hasMounted ? (
                <CountdownTimer startTime={contest.start} />
              ) : (
                "Loading..."
              )}
            </div>

            <button
              onClick={() => onBookmarkToggle(contest.id)}
              className="hover:scale-110 transition-all duration-200"
            >
              <Bookmark
                className={`h-9 w-6 ${isBookmarked
                  ? "fill-indigo-500 text-indigo-500"
                  : "text-gray-400 dark:text-gray-500"
                  }`}
              />
            </button>
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

interface ContestCardProps {
  contest: Contest;
  isBookmarked: boolean;
  onBookmarkToggle: (id: number) => void;
}

interface ContestClientComponentProps {
  initialContests: Contest[];
  showFilters?: boolean;
  bookmarksOnly?: boolean;
}

export default function ContestClientComponent({ initialContests, showFilters = false, bookmarksOnly = false, }: ContestClientComponentProps) {
  const [contests] = useState<Contest[]>(initialContests);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState("soonest");
  const { bookmarkedContests, toggleBookmark } = useBookmarks();
  const allPlatforms = useMemo(() => {
    const platforms = new Set(contests.map(c => c.host));
    return Array.from(platforms).sort();
  }, [contests]);

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const filteredContests = useMemo(() => {
    let result = contests;

    if (bookmarksOnly) {
      result = result.filter(contest =>
        bookmarkedContests.includes(contest.id)
      );
    }

    if (selectedPlatforms.length > 0) {
      result = result.filter(contest =>
        selectedPlatforms.includes(contest.host)
      );
    }

    return result;
  }, [
    contests,
    selectedPlatforms,
    bookmarksOnly,
    bookmarkedContests,
  ]);

  const sortedContests = useMemo(() => {
    const sorted = [...filteredContests];

    switch (sortBy) {
      case "latest":
        return sorted.sort(
          (a, b) =>
            new Date(b.start).getTime() -
            new Date(a.start).getTime()
        );

      case "duration-short":
        return sorted.sort(
          (a, b) => a.duration - b.duration
        );

      case "duration-long":
        return sorted.sort(
          (a, b) => b.duration - a.duration
        );

      case "platform":
        return sorted.sort((a, b) =>
          a.host.localeCompare(b.host)
        );

      case "soonest":
      default:
        return sorted.sort(
          (a, b) =>
            new Date(a.start).getTime() -
            new Date(b.start).getTime()
        );
    }
  }, [filteredContests, sortBy]);

  return (
    <>
      {showFilters && (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 mb-8 flex flex-col sm:flex-row gap-4 w-full">

          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
            Filter by Platform
          </h3>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="max-w-5xl justify-between"
              >
                {selectedPlatforms.length > 0
                  ? `${selectedPlatforms.length} selected`
                  : "Select platforms"}

                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput placeholder="Search platforms..." />

                <CommandList>
                  <CommandEmpty>No platform found.</CommandEmpty>

                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {allPlatforms.map((platform) => {
                      const isSelected =
                        selectedPlatforms.includes(platform);

                      return (
                        <CommandItem
                          key={platform}
                          onSelect={() => {
                            handlePlatformToggle(platform);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-gray-300"
                              }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>

                          <span>{platform}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>

              {selectedPlatforms.length > 0 && (
                <div className="border-t p-2">
                  <button
                    onClick={() => setSelectedPlatforms([])}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 rounded-md border border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="soonest">Soonest First</option>
            <option value="latest">Latest First</option>
            <option value="duration-short">Shortest Duration</option>
            <option value="duration-long">Longest Duration</option>
            <option value="platform">Platform A-Z</option>
          </select>

        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredContests.length > 0 ? (
          sortedContests.map(contest => <ContestCard
            key={contest.id}
            contest={contest}
            isBookmarked={bookmarkedContests.includes(contest.id)}
            onBookmarkToggle={toggleBookmark}
          />)
        ) : (
          <p className="col-span-full text-center text-xl font-semibold text-gray-700 dark:text-gray-200">{bookmarksOnly
            ? "No bookmarked contests yet."
            : "No upcoming contests found for the selected platforms."}</p>
        )}
      </div>
    </>
  );
}