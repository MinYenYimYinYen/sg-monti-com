"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Notice } from "@/app/permission/_components/Notice";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { knowledgeBaseSettingsSelect } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSelect";
import { haveSameUserNames } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsLogic";
import { useApproverCandidates } from "@/app/knowledgeBase/knowledgeBaseSettings/useApproverCandidates";
import { useSaveKnowledgeBaseSettings } from "@/app/knowledgeBase/knowledgeBaseSettings/useSaveKnowledgeBaseSettings";

/** Who approves documents. A flat list: there is no rank or title, only the names. */
export function ApproversSection({ canWrite }: { canWrite: boolean }) {
  const doc = useSelector(knowledgeBaseSettingsSelect.approversDoc);
  if (!doc) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Approvers</h2>
        <p className="text-xs text-muted-foreground">
          The people who approve documents before the AI can use them. With no approvers, no new document version
          can be approved.
        </p>
      </div>
      {canWrite ? (
        <ApproversEditor key={doc.updatedAt ?? "default"} savedUserNames={doc.value.approverUserNames} />
      ) : (
        <ul className="space-y-1 text-sm text-foreground">
          {doc.value.approverUserNames.length === 0 && (
            <li className="text-xs italic text-muted-foreground">No approvers are set.</li>
          )}
          {doc.value.approverUserNames.map((userName) => (
            <li key={userName}>{userName}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Initialized from the saved list and remounted (by key) when a save changes it, so there is no effect
// copying props into state.
function ApproversEditor({ savedUserNames }: { savedUserNames: string[] }) {
  useApproverCandidates();
  const candidates = useSelector(knowledgeBaseSettingsSelect.approverCandidates);
  const { saveApprovers } = useSaveKnowledgeBaseSettings();
  const [selectedUserNames, setSelectedUserNames] = useState(savedUserNames);

  const candidateUserNames = new Set(candidates.map((candidate) => candidate.userName));
  // Only meaningful once the candidates have loaded; before that every saved name would look unknown.
  const unknownSavedUserNames =
    candidates.length > 0 ? savedUserNames.filter((userName) => !candidateUserNames.has(userName)) : [];
  const isDirty = !haveSameUserNames({ first: selectedUserNames, second: savedUserNames });

  const toggle = (userName: string) => {
    setSelectedUserNames((current) =>
      current.includes(userName) ? current.filter((existing) => existing !== userName) : [...current, userName],
    );
  };

  return (
    <div className="space-y-3">
      {unknownSavedUserNames.length > 0 && (
        <Notice tone="warning">
          These saved approvers are not users who can approve: {unknownSavedUserNames.join(", ")}. Untick them and
          save to remove them.
        </Notice>
      )}
      <div className="space-y-1 rounded-md border border-border bg-card p-3">
        {candidates.length === 0 && <p className="text-xs italic text-muted-foreground">Loading users...</p>}
        {candidates.map((candidate) => (
          <div key={candidate.userName} className="flex items-center gap-2">
            <Checkbox
              id={`approver-${candidate.userName}`}
              checked={selectedUserNames.includes(candidate.userName)}
              onCheckedChange={() => toggle(candidate.userName)}
            />
            <Label htmlFor={`approver-${candidate.userName}`} className="cursor-pointer text-sm font-normal">
              {candidate.firstName} {candidate.lastName}{" "}
              <span className="text-xs text-muted-foreground">{candidate.userName}</span>
            </Label>
          </div>
        ))}
        {unknownSavedUserNames.map((userName) => (
          <div key={userName} className="flex items-center gap-2">
            <Checkbox
              id={`approver-${userName}`}
              checked={selectedUserNames.includes(userName)}
              onCheckedChange={() => toggle(userName)}
            />
            <Label htmlFor={`approver-${userName}`} className="cursor-pointer text-sm font-normal">
              {userName} <span className="text-xs text-muted-foreground">(not an eligible user)</span>
            </Label>
          </div>
        ))}
      </div>
      <Button size="sm" disabled={!isDirty} onClick={() => saveApprovers(selectedUserNames)}>
        Save approvers
      </Button>
    </div>
  );
}
