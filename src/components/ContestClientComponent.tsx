'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Contest } from '../types/contest';
import { parseAsUTC } from '@/src/lib/date';

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/src/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";

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

const ContestCard = ({ contest }: { contest: Contest }) => {
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
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out overflow-hidden flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <img
            src={logoUrl}
            alt={`${contest.host} logo`}
            className="h-8 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = `https://placehold.co/100x40/f0f0f0/333?text=${contest.host.split('.')[0]}`; }}
          />
          {hasMounted ? <CountdownTimer startTime={contest.start} /> : <span className="text-sm font-semibold text-indigo-600">Loading...</span>}
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2 leading-tight">{contest.event}</h3>
        <div className="text-sm text-gray-700 space-y-1">
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
      <div className="bg-gray-50 p-4">
        <a
          href={contest.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block text-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          Go to Contest
        </a>
      </div>
    </div>
  );
};

interface ContestClientComponentProps {
  initialContests: Contest[];
  showFilters?: boolean;
}

export default function ContestClientComponent({ initialContests, showFilters = false }: ContestClientComponentProps) {
  const [contests] = useState<Contest[]>(initialContests);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

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
    if (selectedPlatforms.length === 0) {
      return contests;
    }
    return contests.filter(c => selectedPlatforms.includes(c.host));
  }, [contests, selectedPlatforms]);



  return (
    <>
      {showFilters && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8 flex items-center gap-4">

          <h3 className="text-sm font-semibold text-gray-600 whitespace-nowrap">
            Filter by Platform
          </h3>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[280px] justify-between"
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
                          onSelect={() =>
                            handlePlatformToggle(platform)
                          }
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
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredContests.length > 0 ? (
          filteredContests.map(contest => <ContestCard key={contest.id} contest={contest} />)
        ) : (
          <p className="col-span-full text-center text-xl font-semibold text-gray-700">No upcoming contests found for the selected platforms.</p>
        )}
      </div>
    </>
  );
}