import { AlertTriangle } from "lucide-react";

/** Every parse problem is shown, never truncated: a changed or altered file must be noticed. */
export function ImportParseErrors({
  fileName,
  errors,
}: {
  fileName: string;
  errors: string[];
}) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="text-sm font-semibold text-destructive">
          {fileName} cannot be imported: {errors.length} problem{errors.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="font-mono text-xs text-destructive">
            {error}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Nothing was imported. Fix the file or tell the developer if the bank changed its format.
      </p>
    </div>
  );
}
