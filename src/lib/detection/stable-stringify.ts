// Order-independent JSON, used to compare evidence read back from a jsonb column
// (Postgres does not preserve object key order) against freshly computed
// evidence. Sorts keys recursively so two equivalent objects stringify equally.
// Pure and isomorphic — no server-only deps — so detection can use it and tests
// can exercise it directly.
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
