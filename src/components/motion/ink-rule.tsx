export function InkRule({
  origin = "start",
  className = "",
}: {
  origin?: "start" | "end";
  className?: string;
}) {
  return (
    <span
      className={`ink-rule${origin === "end" ? " ink-rule-end" : ""}${className ? ` ${className}` : ""}`}
      data-ink
      data-testid="signature-ink"
      aria-hidden="true"
    />
  );
}
