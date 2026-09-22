import Link from "next/link";

const CALL_LOG_SECTIONS = [
  {
    label: "Call Log Status",
    href: "/realGreen/callLog/callLogStatus",
    description:
      "Manages the call log status configuration for this company. " +
      "Each status has a single-character code (e.g. \"X\", \"Z\") that RealGreen uses to classify call logs. " +
      "The resolved flag determines whether a call log with that status is considered closed. " +
      "Because RealGreen does not expose a status API, statuses must be configured here manually.",
    howToUse:
      "Add a status entry for each code you see appearing in your call logs. " +
      "Set resolved to true for statuses that represent a completed or closed call log (e.g. \"Resolved\", \"Cancel Save\"). " +
      "Set isDefault to true for the status RealGreen assigns to new call logs (typically \"In Process\"). " +
      "Once statuses are configured, call logs will display their resolved state correctly throughout the app.",
  },
] as const;

export default function CallLogPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-foreground">Call Log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configuration and management tools for the RealGreen call log integration.
              Select a section below to get started.
            </p>
          </div>

          {CALL_LOG_SECTIONS.map((section) => (
            <div
              key={section.href}
              className="rounded-lg border border-border bg-card p-5 space-y-3"
            >
              <Link
                href={section.href}
                className="text-base font-semibold text-primary hover:underline"
              >
                {section.label}
              </Link>

              <p className="text-sm text-foreground leading-relaxed">
                {section.description}
              </p>

              <div className="rounded-md bg-accent/10 border border-accent/20 px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  How to use
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {section.howToUse}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
