"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Car,
  ClipboardList,
  FileText,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSearchFilter } from "@/components/search/search-filter-context";
import {
  SEARCH_ENTITY_LABELS,
  SEARCH_ENTITY_ORDER,
  SEARCH_MIN_CHARS,
  type SearchEntityType,
  type SearchIndexItem,
  type SearchScope,
} from "@/types/search";

export type SearchBarProps = {
  /** What this instance searches. `general` (Dashboard) spans all entities. */
  scope: SearchScope;
  /**
   * `dropdown` (default): shows a grouped results dropdown over a dimmed
   * backdrop — used on the Dashboard. `filter`: publishes the query to the
   * shared SearchFilter context so the page's table filters live, no dropdown.
   */
  mode?: "dropdown" | "filter";
  /**
   * Loads the full searchable index for the scope (dropdown mode only). Called
   * once on mount and refreshed when stale; filtering happens in the browser.
   */
  loadIndex?: (scope: SearchScope) => Promise<SearchIndexItem[]>;
  placeholder?: string;
  minChars?: number;
  /** Max results rendered per entity group. */
  perGroupLimit?: number;
  className?: string;
};

const ENTITY_ICONS: Record<SearchEntityType, LucideIcon> = {
  customer: Users,
  vehicle: Car,
  job: ClipboardList,
  invoice: FileText,
  service: Wrench,
};

// Re-fetch the index on open if it's older than this — keeps the snapshot
// reasonably fresh without paying a round-trip on every keystroke.
const STALE_AFTER_MS = 15_000;

export function SearchBar({
  scope,
  mode = "dropdown",
  loadIndex,
  placeholder = "Search…",
  minChars = SEARCH_MIN_CHARS,
  perGroupLimit = 8,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const filter = useSearchFilter();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<SearchIndexItem[] | null>(null);
  const [open, setOpen] = React.useState(false);

  // Stable refs so the loader isn't an effect dependency.
  const loadRef = React.useRef(loadIndex);
  React.useEffect(() => {
    loadRef.current = loadIndex;
  }, [loadIndex]);

  const loadedAt = React.useRef(0);
  const loadId = React.useRef(0);

  const refresh = React.useCallback(() => {
    if (!loadRef.current) return;
    const id = ++loadId.current;
    loadRef
      .current(scope)
      .then((data) => {
        if (id === loadId.current) {
          setItems(data);
          loadedAt.current = Date.now();
        }
      })
      .catch(() => {
        if (id === loadId.current) setItems((prev) => prev ?? []);
      });
  }, [scope]);

  // Prefetch once on mount so the first keystroke is already instant.
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const q = query.trim().toLowerCase();
  const eligible = q.length >= minChars;

  // Pure client-side filter + group — runs synchronously on every keystroke.
  const groups = React.useMemo(() => {
    if (!eligible || !items) return [];
    const matched = items.filter((i) => i.haystack.includes(q));
    return SEARCH_ENTITY_ORDER.map((type) => ({
      type,
      label: SEARCH_ENTITY_LABELS[type],
      results: matched.filter((i) => i.type === type).slice(0, perGroupLimit),
    })).filter((g) => g.results.length > 0);
  }, [eligible, items, q, perGroupLimit]);

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const showResults = open && eligible;
  const loading = items === null;

  // Filter mode: just the input, wired to the shared query. The page's table
  // filters itself live — no dropdown, no backdrop.
  if (mode === "filter") {
    return (
      <Command
        shouldFilter={false}
        className={cn("overflow-visible bg-transparent p-0", className)}
      >
        <CommandInput
          value={filter.query}
          onValueChange={filter.setQuery}
          placeholder={placeholder}
        />
      </Command>
    );
  }

  return (
    <>
      {/* Dim + blur the rest of the screen while results are showing; the
          input (z-50) and dropdown (z-50) stay crisp above it. */}
      {showResults && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-hidden
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm duration-150 animate-in fade-in-0"
            />,
            document.body,
          )
        : null}
      <Command
        shouldFilter={false}
        className={cn("overflow-visible bg-transparent p-0", className)}
      >
        <Popover open={showResults} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className={cn(showResults && "relative z-50")}>
            <CommandInput
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                if (value.trim().length >= minChars) setOpen(true);
              }}
              onFocus={() => {
                if (eligible) setOpen(true);
                else if (Date.now() - loadedAt.current > STALE_AFTER_MS) refresh();
              }}
              placeholder={placeholder}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={6}
          // Don't pull focus out of the input — let cmdk drive keyboard nav.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <CommandList>
            {groups.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "No results found."}
              </div>
            ) : (
              groups.map((group) => {
                const Icon = ENTITY_ICONS[group.type];
                return (
                  <CommandGroup key={group.type} heading={group.label}>
                    {group.results.map((result) => {
                      // If the query matched a secondary field (address, plate)
                      // rather than the title/subtitle, surface that field.
                      const inTitle = result.title.toLowerCase().includes(q);
                      const inSubtitle = (result.subtitle ?? "")
                        .toLowerCase()
                        .includes(q);
                      const matchedExtra =
                        !inTitle && !inSubtitle
                          ? result.extra?.find((e) =>
                              e.toLowerCase().includes(q),
                            )
                          : undefined;
                      return (
                        <CommandItem
                          key={`${group.type}-${result.id}`}
                          value={`${group.type}-${result.id}`}
                          onSelect={() => handleSelect(result.href)}
                        >
                          <Icon className="text-muted-foreground" />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{result.title}</span>
                            {result.subtitle ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            ) : null}
                            {matchedExtra ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {matchedExtra}
                              </span>
                            ) : null}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
    </>
  );
}
