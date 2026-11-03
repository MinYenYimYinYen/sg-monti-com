"use client";

import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/style/components/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/style/components/alert-dialog";
import {
  QboConnectionPhase,
  QboConnectionStatus,
} from "@/app/qbo/connection/types/QboConnectionTypes";

const PHASE_LABELS: Record<QboConnectionPhase, string> = {
  notConnected: "Not connected",
  connected: "Connected",
  reconnectRequired: "Reconnect required",
};

function environmentDescription(status: QboConnectionStatus | null): string {
  if (status?.configuredEnvironment === "production") {
    return "Production: this is the live company file.";
  }
  if (status?.configuredEnvironment === "sandbox") return "Sandbox: test data only.";
  return "Connection to the company's QuickBooks books.";
}

function formatDateTime(iso: string | null): string {
  return iso ? prettyDate(iso, "MMM d, yyyy h:mm a", { fallback: "Unknown" }) : "None";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}

type QboConnectionCardProps = {
  status: QboConnectionStatus | null;
  isStarting: boolean;
  onConnectAction: () => void;
  onDisconnectAction: () => void;
};

export function QboConnectionCard({
  status,
  isStarting,
  onConnectAction,
  onDisconnectAction,
}: QboConnectionCardProps) {
  const isConnected = status?.phase === "connected";
  const canConnect = status !== null && status.configProblem === null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>QuickBooks Online</CardTitle>
          {status && (
            <Badge
              variant={isConnected ? "accent" : "destructive"}
              intensity={isConnected ? "solid" : "soft"}
            >
              {PHASE_LABELS[status.phase]}
            </Badge>
          )}
        </div>
        <CardDescription>{environmentDescription(status)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === null ? (
          <p className="text-sm text-muted-foreground">Checking connection...</p>
        ) : (
          <dl className="divide-y divide-border">
            <DetailRow label="Company (realm) ID" value={status.realmId ?? "None"} />
            <DetailRow label="Connected by" value={status.connectedByUserName ?? "None"} />
            <DetailRow label="Connected at" value={formatDateTime(status.connectedAt)} />
            <DetailRow
              label="Access token expires"
              value={formatDateTime(status.accessTokenExpiresAt)}
            />
            <DetailRow
              label="Reconnect needed by"
              value={formatDateTime(status.refreshTokenExpiresAt)}
            />
          </dl>
        )}

        <div className="flex gap-2">
          <Button onClick={onConnectAction} disabled={!canConnect || isStarting}>
            {isConnected ? "Reconnect" : "Connect to QuickBooks"}
          </Button>

          {status && status.phase !== "notConnected" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" intensity="soft">
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect from QuickBooks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This revokes the app&apos;s access at Intuit and deletes the stored tokens. You
                    can connect again at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDisconnectAction}>Disconnect</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
