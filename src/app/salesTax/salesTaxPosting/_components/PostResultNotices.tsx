"use client";

import { useSelector } from "react-redux";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { salesTaxPostingSelect } from "@/app/salesTax/salesTaxPosting/salesTaxPostingSelect";

/** The answer to the last post: what went wrong, what to look at, and that it worked. */
export function PostResultNotices() {
  const lastPostResult = useSelector(salesTaxPostingSelect.lastPostResult);
  const postStatus = useSelector(salesTaxPostingSelect.postStatus);

  if (!lastPostResult) return null;

  return (
    <>
      {lastPostResult.problems.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Not everything went through</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {lastPostResult.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {lastPostResult.warnings.length > 0 && (
        <div className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary">
          {lastPostResult.warnings.join(" ")}
        </div>
      )}
      {postStatus === "success" && (
        <p className="text-sm font-medium">Posted to QuickBooks, files attached.</p>
      )}
    </>
  );
}
