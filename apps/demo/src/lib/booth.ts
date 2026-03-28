export function isBooth(searchParams: URLSearchParams | ReturnType<typeof import("next/navigation").useSearchParams>): boolean {
  return searchParams.get("booth") === "cvde";
}
