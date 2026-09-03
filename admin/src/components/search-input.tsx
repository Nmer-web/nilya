"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Search lives in the URL so the filtering itself stays server-side: this only
 * debounces typing into a query param and lets the Server Component re-read.
 */
export function SearchInput({
  placeholder,
  paramName = "q",
  className,
}: {
  placeholder: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep in step when the URL changes from elsewhere (back button, a cleared
  // filter) without fighting the user mid-keystroke.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    if (value === urlValue) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value.trim()) next.set(paramName, value.trim());
      else next.delete(paramName);
      next.delete("page"); // a new query starts at page one
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [value, urlValue, paramName, pathname, router, searchParams]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={pending}
        className="h-9 bg-card pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear search</span>
        </button>
      ) : null}
    </div>
  );
}
