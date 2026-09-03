import Link from "next/link";

// ---------------------------------------------------------------------------
// Edit this constant to update the overview text for each sanity check section.
// ---------------------------------------------------------------------------

const SANITY_SECTIONS = [
  {
    label: "Zero Revenue",
    href: "/sanity/zeroRevenue",
    description:
      "Finds customers, programs, and services where renewal-eligible services have $0 pricing. " +
      "This is a waterfall check — problems at the customer level cascade down to programs and services, " +
      "so the counts on the Programs and Services tabs will shrink as you fix customers.",
    howToUse:
      "Start on the Customers tab and address zero-revenue customers first. " +
      "Fixing a customer's pricing will automatically reduce the downstream program and service counts. " +
      "Move to Programs once customers are clean, then Services last.",
  },
  {
    label: "Flag Rules",
    href: "/sanity/flags",
    description:
      "Defines and enforces logical constraints on which RealGreen flags a customer may hold simultaneously. " +
      "Supports two rule types: XOR (exactly one of the specified flags must be present) and " +
      "NAND (at most one of the specified flags may be present). " +
      "Violations are surfaced as advisories grouped by message, sorted by the number of affected customers.",
    howToUse:
      "Go to the Rules sub-tab to create or edit flag rules — give each rule a label, choose XOR or NAND, " +
      "and select at least two flags. The violations view (the default tab) shows which customers are out of " +
      "compliance and why. Rules are advisory only; no automated changes are made.",
  },
  {
    label: "Customer Sanity",
    href: "/sanity/customerSanity",
    description:
      "Groups customers by their combination of active program codes. " +
      "This makes it easy to spot customers with unusual or unexpected program mixes — " +
      "for example, a customer who only has and EST service, or none at all should not be an active customer.",
    howToUse:
      "Use the sort controls in the options sheet (top-right gear icon) to sort groups by customer count or " +
      "program code count. Expand a group to see which customers share that combination. " +
      "Use the exclude filter to hide program codes that represent non-renewable services, " +
      "so they don't clutter the grouping.",
  },
  {
    label: "Program Sanity",
    href: "/sanity/programSanity",
    description:
      "Groups programs by their service status combination (e.g. YYYNYN) for a selected program code. " +
      "Helps identify programs that will renew in a way that doesn't make good sense — " +
      "for example, an ornamental program that like NNYN may have been sold late in the year, but it should renew as YNNN" +
      " or better, YYYY.  Make that decision based on customer and call log history.",
    howToUse:
      "Pick a program code from the picker at the top. The distribution below shows every unique " +
      "status combination and how many programs have it. Expand a group to see the individual programs. " +
      "Only program codes with more than one service are shown, since single-service codes have no meaningful distribution.",
  },
  {
    label: "Size Sanity",
    href: "/sanity/sizeSanity",
    description:
      "Flags customers where service sizes or prices are inconsistent. " +
      "Three tiers of problems are detected in priority order: " +
      "(1) services within a program disagree on size, " +
      "(2) services agree on size but disagree on price, " +
      "(3) services agree but their size doesn't match the customer's recorded size.",
    howToUse:
      "Each customer row shows which programs are flagged and the reason. " +
      "Fix inconsistent sizes first — once sizes agree, price and customer-size mismatches " +
      "often resolve themselves or become easier to address. " +
      "Use the refresh button to reload customer data after making changes in RealGreen. " +
      "Many of the issues you find are valid cases, but some are errors that need fixing.",
  },
  {
    label: "Prenotification",
    href: "/sanity/prenotification",
    description:
      "Shows all customers, programs, and services that have a call-ahead (prenotification) instruction " +
      "set directly on them, grouped by the call-ahead description. ",
    howToUse:
      "Browse each tab (Customers, Programs, Services) to see which entities have prenotification requirements " +
      "and what the instruction says. Use this to audit call-ahead coverage and verify that descriptions are " +
      "correct and consistently worded across similar accounts. " +
      "The main thing we're looking for are prenotifications that aren't automated, like ARRANGE TO MEET. " +
      "These are usually one-off prenotifications that should not renew into the next season.",
  },
  {
    label: "Promise Sanity",
    href: "/sanity/promiseSanity",
    description:
      "Checks parity between the Promised checkbox on services and the presence of promise notation " +
      "p[...] (permanent) or p{...} (seasonal) in tech notes at the service, program, or customer level. " +
      "Promise notes use comma-separated key: value pairs — for example p[time: after 10am, days: MWF]. " +
      "The parser validates strict fields (date, time, days) and reports any formatting issues.",
    howToUse:
      "Orphaned Notes — a p[...] pattern exists in a tech note but the corresponding services aren't marked Promised. " +
      "Add the Promised flag or remove the note. " +
      "Invalid Promise Note — services are marked Promised but no p[...] pattern is found at any level " +
      "(service, program, or customer). Add a promise note using the wand icon, or uncheck Promised. " +
      "Invalid Values — a p[...] note was found but the parser couldn't interpret a strict field (date, time, or days). " +
      "Fix the note format — use the Promise Builder to generate a valid string. " +
      "Valid Promises — correctly matched promised services, grouped by their normalized promise string. " +
      "Use this to audit what promises are in effect and spot inconsistencies across similar customers. " +
      "WARNING: Don't run this until renewed services and programs exist for the following year — " +
      "SA5 does not allow changing the Promised box on posted services.",
  },
] as const;

// ---------------------------------------------------------------------------

export default function SanityPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-foreground">Sanity Checks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              A collection of data quality checks across customers, programs, and services.
              Select a section below to get started.
            </p>
          </div>

          {SANITY_SECTIONS.map((section) => (
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
