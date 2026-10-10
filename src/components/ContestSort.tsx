"use client";
import { Select } from "radix-ui";
import { ArrowDownWideNarrow, Check, ChevronDown } from "lucide-react";

const options = [
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest first" },
  { value: "duration-short", label: "Shortest duration" },
  { value: "duration-long", label: "Longest duration" },
  { value: "platform", label: "Platform A–Z" },
];
export default function ContestSort({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="sort-trigger" aria-label="Sort contests">
        <ArrowDownWideNarrow size={16} aria-hidden="true" />
        <Select.Value />
        <Select.Icon className="sort-chevron">
          <ChevronDown size={14} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="sort-menu"
          position="popper"
          align="end"
          sideOffset={8}
          collisionPadding={16}
        >
          <Select.Viewport>
            <Select.Group>
              <Select.Label className="sort-label">Sort contests</Select.Label>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="sort-option"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={15} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
