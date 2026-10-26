"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronsUpDown, PencilLine } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { JournalCandidate } from "@/features/journal/lib/journal";
import { getPlatform } from "@/features/contests/lib/platforms";

export default function JournalContestPicker({
  candidates,
  value,
  onSelect,
}: {
  candidates: JournalCandidate[];
  value: number | null;
  onSelect: (candidate: JournalCandidate | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = candidates.filter((candidate) => {
    const text =
      `${candidate.title} ${candidate.host} ${getPlatform(candidate.host).name} ${candidate.date}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const selected = candidates.find((candidate) => candidate.id === value);
  function choose(candidate: JournalCandidate | null) {
    onSelect(candidate);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      ref={root}
      className="journal-contest-picker"
      data-picker-open={open}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        data-state={open ? "open" : "closed"}
        onClick={() => {
          setSearch("");
          setOpen((current) => !current);
        }}
        id="journal-prefill"
        className="journal-contest-trigger"
        data-journal-contest-picker
        aria-describedby="journal-contest-hint"
      >
        <span>
          {selected
            ? `${selected.title} · ${selected.date}`
            : "Enter contest details manually"}
        </span>
        <ChevronsUpDown size={17} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose a contest"
          className="journal-contest-popover"
        >
          <Command label="Find a contest" loop shouldFilter={false}>
            <CommandInput
              ref={searchInput}
              value={search}
              onValueChange={setSearch}
              aria-label="Search contests"
              placeholder="Search name, platform or date…"
            />
            <CommandList aria-label="Recent and saved contests">
              <CommandEmpty>
                No matching contests. Try another name, platform or date.
              </CommandEmpty>
              {matches.map((candidate) => (
                <CommandItem
                  key={candidate.id}
                  value={String(candidate.id)}
                  keywords={[
                    candidate.title,
                    candidate.host,
                    getPlatform(candidate.host).name,
                    candidate.date,
                  ]}
                  disabled={!!candidate.entryId}
                  data-checked={value === candidate.id}
                  onSelect={() => choose(candidate)}
                  className="journal-contest-option"
                >
                  <span>
                    <span className="journal-contest-title">
                      {candidate.title}
                    </span>
                    <span className="journal-contest-meta">
                      {getPlatform(candidate.host).name} · {candidate.date}
                      {candidate.entryId ? " · Already in your journal" : ""}
                    </span>
                  </span>
                </CommandItem>
              ))}
              <CommandItem
                value="manual"
                forceMount
                onSelect={() => choose(null)}
                data-checked={value === null}
              >
                <PencilLine aria-hidden="true" />
                Enter contest details manually
              </CommandItem>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
