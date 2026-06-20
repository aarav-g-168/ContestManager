'use client';

import { useState, useMemo, } from 'react';
import type { Contest } from '../types/contest';

import { Check, ChevronsUpDown } from "lucide-react";
import ContestCard from "./contestCard";
import { useReminders } from "@/hooks/reminders";
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

interface ContestClientComponentProps {
  initialContests: Contest[];
  showFilters?: boolean;
  bookmarksOnly?: boolean;
  remindersOnly?: boolean;
}

export default function ContestClientComponent({ initialContests, showFilters = false, bookmarksOnly = false, remindersOnly = false }: ContestClientComponentProps) {
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

  const {
    reminders,
    addReminder,
    removeReminder,
  } = useReminders();

  const filteredContests = useMemo(() => {
    let result = contests;

    if (remindersOnly) {
      result = result.filter(
        contest => contest.id in reminders
      );
    }

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
            hasReminder={contest.id in reminders}
            reminderType={reminders[contest.id]}
            onReminderSet={addReminder}
          />)
        ) : (
          <p className="col-span-full text-center whitespace-pre-line text-xl font-semibold text-gray-700 dark:text-gray-200">
            {bookmarksOnly
              ? "✨ No bookmarked contests yet.\nBrowse contests and save the ones you're interested in."
              : remindersOnly
                ? "🔔 No reminders set yet.\nSet reminders from the contest menu."
                : "No upcoming contests found for the selected platforms."}
          </p>
        )}
      </div>
    </>
  );
}