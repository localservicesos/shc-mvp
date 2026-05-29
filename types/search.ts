/**
 * Search types shared between the server search layer (`lib/db/search.ts`,
 * `app/app/search-actions.ts`) and the client `SearchBar` component. Safe to
 * import from both server and client code — no data-access logic lives here.
 */

/** What a `SearchBar` instance is allowed to look through. */
export type SearchScope =
  | "general" // Dashboard — search across every entity
  | "customers"
  | "vehicles"
  | "jobs"
  | "invoices"
  | "services";

/** The concrete entity a single result points at — drives label, icon and href. */
export type SearchEntityType =
  | "customer"
  | "vehicle"
  | "job"
  | "invoice"
  | "service";

export type SearchResult = {
  id: string;
  type: SearchEntityType;
  /** Primary line, e.g. "John Smith" or "INV-0001". */
  title: string;
  /** Optional secondary line, e.g. phone, plate, or status. */
  subtitle?: string;
  /** Where selecting the result navigates to. */
  href: string;
};

/** Results for one entity type, rendered as a labelled section in the dropdown. */
export type SearchGroup = {
  type: SearchEntityType;
  label: string;
  results: SearchResult[];
};

/**
 * A pre-built index row. Loaded once per page, then filtered in the browser:
 * `haystack` is a lowercased blob of all searchable fields, the rest are the
 * display/navigation fields (same shape as `SearchResult`).
 */
export type SearchIndexItem = SearchResult & {
  /** Lowercased concatenation of every searchable field. Not rendered. */
  haystack: string;
  /**
   * Secondary fields (e.g. address, plate) that are part of `haystack`. The
   * dropdown surfaces the matching one when the query hit it rather than the
   * title/subtitle — so searching part of an address shows that address.
   */
  extra?: string[];
};

/** Minimum characters before the dropdown filters and opens. */
export const SEARCH_MIN_CHARS = 2;

/** Order entity groups appear in for `general` (Dashboard) search. */
export const SEARCH_ENTITY_ORDER: SearchEntityType[] = [
  "customer",
  "vehicle",
  "job",
  "invoice",
  "service",
];

/** Group headings, keyed by entity type. */
export const SEARCH_ENTITY_LABELS: Record<SearchEntityType, string> = {
  customer: "Customers",
  vehicle: "Vehicles",
  job: "Jobs",
  invoice: "Invoices",
  service: "Services",
};
