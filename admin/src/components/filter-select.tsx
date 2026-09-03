"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/**
 * A filter that writes to the URL, so the filtering itself stays in the Server
 * Component that reads the query string.
 */
export function FilterSelect({
  paramName,
  options,
  allLabel,
  ariaLabel,
  className,
}: {
  paramName: string;
  options: readonly FilterOption[];
  allLabel: string;
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const ALL = "__all__";
  const current = searchParams.get(paramName) ?? ALL;

  const items = [{ value: ALL, label: allLabel }, ...options];

  function onChange(value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) next.delete(paramName);
    else next.set(paramName, value);
    next.delete("page"); // a new filter starts at page one
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <Select items={items} value={current} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        aria-busy={pending}
        className={cn("h-9 min-w-40 bg-card", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
