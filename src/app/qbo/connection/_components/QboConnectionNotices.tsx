"use client";

import { Button } from "@/style/components/button";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import {
  callbackFailureMessage,
  isCallbackFailureReason,
} from "@/app/qbo/connection/_lib/qboCallbackMessages";
import { QboConnectionStatus } from "@/app/qbo/connection/types/QboConnectionTypes";

type QboConnectionNoticesProps = {
  status: QboConnectionStatus | null;
  returnedResult: string | null;
  returnedReason: string | null;
  revocationUnconfirmed: boolean;
  onDismissResultAction: () => void;
  onDismissRevocationAction: () => void;
};

function DismissibleAlertBody({
  message,
  onDismissAction,
}: {
  message: string;
  onDismissAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{message}</span>
      <Button variant="outline" size="sm" onClick={onDismissAction}>
        Dismiss
      </Button>
    </div>
  );
}

export function QboConnectionNotices({
  status,
  returnedResult,
  returnedReason,
  revocationUnconfirmed,
  onDismissResultAction,
  onDismissRevocationAction,
}: QboConnectionNoticesProps) {
  return (
    <>
      {returnedResult === "connected" && (
        <Alert>
          <AlertTitle>Connected to QuickBooks</AlertTitle>
          <AlertDescription>
            <DismissibleAlertBody
              message="The connection is saved. Tokens are stored encrypted on the server."
              onDismissAction={onDismissResultAction}
            />
          </AlertDescription>
        </Alert>
      )}

      {returnedResult === "error" && (
        <Alert variant="destructive">
          <AlertTitle>The connection was not completed</AlertTitle>
          <AlertDescription>
            <DismissibleAlertBody
              message={
                isCallbackFailureReason(returnedReason)
                  ? callbackFailureMessage(returnedReason)
                  : "Something went wrong. Please try again."
              }
              onDismissAction={onDismissResultAction}
            />
          </AlertDescription>
        </Alert>
      )}

      {revocationUnconfirmed && (
        <Alert variant="destructive">
          <AlertTitle>Disconnected here, but Intuit did not confirm</AlertTitle>
          <AlertDescription>
            <DismissibleAlertBody
              message="The stored tokens were deleted, but Intuit did not confirm the revocation. To be sure access is removed, remove this app from the connected apps page in the QuickBooks account."
              onDismissAction={onDismissRevocationAction}
            />
          </AlertDescription>
        </Alert>
      )}

      {status?.configProblem && (
        <Alert variant="destructive">
          <AlertTitle>QuickBooks is not configured</AlertTitle>
          <AlertDescription>{status.configProblem}</AlertDescription>
        </Alert>
      )}

      {status?.environmentMismatch && (
        <Alert variant="destructive">
          <AlertTitle>Environment mismatch</AlertTitle>
          <AlertDescription>
            This connection was made against {status.connectedEnvironment}, but the server is set
            to {status.configuredEnvironment}. Disconnect and reconnect to use the current setting.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
