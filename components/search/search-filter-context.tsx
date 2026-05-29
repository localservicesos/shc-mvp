"use client";

import * as React from "react";
import type { SearchIndexItem } from "@/types/search";

type SearchFilterValue = {
  query: string;
  setQuery: (q: string) => void;
};

/**
 * Shares the live search query between the header SearchBar (in `filter` mode)
 * and the page's table, which are separate subtrees. Default is a no-op so the
 * SearchBar is safe to render outside a provider (e.g. the Dashboard dropdown).
 */
const SearchFilterContext = React.createContext<SearchFilterValue>({
  query: "",
  setQuery: () => {},
});

export function SearchFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [query, setQuery] = React.useState("");
  const value = React.useMemo(() => ({ query, setQuery }), [query]);
  return (
    <SearchFilterContext.Provider value={value}>
      {children}
    </SearchFilterContext.Provider>
  );
}

export function useSearchFilter(): SearchFilterValue {
  return React.useContext(SearchFilterContext);
}

/**
 * Given a prebuilt index (id + haystack), returns the set of row ids matching
 * the current query — or `null` when there's nothing to filter (show all).
 */
export function useFilteredIds(
  index: SearchIndexItem[],
  minChars = 1,
): Set<string> | null {
  const { query } = useSearchFilter();
  const q = query.trim().toLowerCase();
  return React.useMemo(() => {
    if (q.length < minChars) return null;
    return new Set(
      index.filter((i) => i.haystack.includes(q)).map((i) => i.id),
    );
  }, [index, q, minChars]);
}
