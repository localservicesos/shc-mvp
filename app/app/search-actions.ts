"use server";

import { buildSearchIndex } from "@/lib/db/search";
import type { SearchIndexItem, SearchScope } from "@/types/search";

/**
 * Server action consumed by the `SearchBar` component. Returns the full
 * searchable index for the scope; the component loads it once and filters in
 * the browser for instant results. Business scoping is enforced by RLS.
 */
export async function loadSearchIndexAction(
  scope: SearchScope,
): Promise<SearchIndexItem[]> {
  return buildSearchIndex(scope);
}
