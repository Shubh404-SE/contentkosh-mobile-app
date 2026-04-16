/** ISO string suitable for API date fields; undefined when no date selected. */
export function toISODateTime(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString();
}
