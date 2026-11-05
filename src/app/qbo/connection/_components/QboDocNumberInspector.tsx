"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/style/components/card";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboConnectionSelect } from "@/app/qbo/connection/qboConnectionSelect";
import { qboConnectionActions } from "@/app/qbo/connection/qboConnectionSlice";
import { validateDocNumberForQuery } from "@/app/qbo/purchase/_lib/qboDocNumberInspectUtils";

/**
 * A temporary, read-only diagnostic for the DocNumber (Ref no.) design: finds purchases by Ref
 * no. and shows the raw CustomField. Remove it once the marker is designed.
 */
export function QboDocNumberInspector() {
  const inspection = useSelector(qboConnectionSelect.docNumberInspection);
  // Dispatches directly: useQboConnection forces a status fetch on mount, which the panel owns.
  const dispatch = useAppDispatch();
  const [docNumber, setDocNumber] = useState("");

  const trimmed = docNumber.trim();
  const problem = trimmed ? validateDocNumberForQuery(trimmed) : null;

  // Forced: a diagnostic must always make a live call, never be deduplicated.
  const handleLookup = () => {
    dispatch(
      qboConnectionActions.inspectQboDocNumber({
        params: { docNumber: trimmed },
        config: { force: true, loadingMsg: "Looking up Ref no. in QuickBooks..." },
      }),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ref no. lookup (diagnostic)</CardTitle>
        <CardDescription>
          Read only. Finds purchases by Ref no. and shows what QuickBooks holds in their custom
          fields. Nothing is stored or changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            className="max-w-56"
            placeholder="Ref no., for example TEST"
            value={docNumber}
            onChange={(event) => setDocNumber(event.target.value)}
          />
          <Button
            variant="primary"
            intensity="soft"
            disabled={!trimmed || problem !== null}
            onClick={handleLookup}
          >
            Look up
          </Button>
        </div>
        {problem && <p className="text-xs text-destructive">{problem}</p>}

        {inspection && (
          <div className="space-y-2 rounded-md border border-border bg-accent/10 p-3">
            <p className="text-sm font-medium text-foreground">
              {inspection.matchCount} purchase{inspection.matchCount === 1 ? "" : "s"} with Ref no.
              &quot;{inspection.docNumber}&quot;
            </p>
            {inspection.matches.map((match) => (
              <pre
                key={match.Id}
                className="overflow-x-auto rounded bg-card p-2 text-xs text-foreground"
              >
                {JSON.stringify(match, null, 2)}
              </pre>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
