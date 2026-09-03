/**
 * A JSON value behind a native `<details>` disclosure. Used for the audit
 * log's before/after snapshots, where the interesting case is a small diff and
 * the common case is nothing at all.
 */
export function JsonViewer({
  label,
  value,
  open = false,
}: {
  label: string;
  value: unknown;
  open?: boolean;
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "object" && Object.keys(value as object).length === 0);

  if (isEmpty) {
    return (
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">{label}:</span> none
      </p>
    );
  }

  return (
    <details open={open} className="group text-xs">
      <summary className="cursor-pointer select-none rounded font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {label}
      </summary>
      <pre className="mt-1.5 max-h-[200px] overflow-auto rounded-lg border bg-muted p-3 font-mono text-[12px] leading-relaxed text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
