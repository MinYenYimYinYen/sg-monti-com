"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { api } from "@/lib/api/api";
import { handleError } from "@/lib/errors/errorHandler";
import { AppError } from "@/lib/errors/AppError";
import { DataResponse } from "@/lib/api/types/responses";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { useQboConnection } from "@/app/qbo/connection/useQboConnection";
import { qboConnectionSelect } from "@/app/qbo/connection/qboConnectionSelect";
import { QboConnectionNotices } from "@/app/qbo/connection/_components/QboConnectionNotices";
import { QboConnectionCard } from "@/app/qbo/connection/_components/QboConnectionCard";
import { QBO_CONNECTION_PAGE_PATH } from "@/app/qbo/_lib/auth/qboOAuthUtils";

// Separate from the workspace so the status load (which fires on mount) only ever runs for a user
// who holds the read.
export function QboConnectionPanel() {
  return (
    <GatedPanel requirement={can.qboConnection.read}>
      <QboConnectionWorkspace />
    </GatedPanel>
  );
}

// The one place the status fetch is triggered (it forces a refresh), so keep the hook here only.
function QboConnectionWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allows = useSelector(userCapabilitiesSelect.allows);
  const status = useSelector(qboConnectionSelect.status);
  const revocationUnconfirmed = useSelector(qboConnectionSelect.revocationUnconfirmed);
  const testResult = useSelector(qboConnectionSelect.testResult);
  const { disconnect, dismissRevocationNotice, testConnection } = useQboConnection();
  const [isStarting, setIsStarting] = useState(false);

  const handleConnect = async () => {
    setIsStarting(true);
    try {
      const res = await api<DataResponse<{ authorizeUrl: string }>>("/qbo/connection/api", {
        method: "POST",
        body: { op: "startConnect" },
      });
      if (!res.success) throw new AppError({ message: res.message, type: "API_ERROR" });
      // Leaves the app for Intuit's consent screen. Only the callback route brings the user back.
      window.location.assign(res.payload.authorizeUrl);
    } catch (e) {
      handleError(e);
      setIsStarting(false);
    }
  };

  const handleDismissResult = () => {
    router.replace(QBO_CONNECTION_PAGE_PATH);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl space-y-4">
        <QboConnectionNotices
          status={status}
          returnedResult={searchParams.get("qbo")}
          returnedReason={searchParams.get("reason")}
          revocationUnconfirmed={revocationUnconfirmed}
          onDismissResultAction={handleDismissResult}
          onDismissRevocationAction={dismissRevocationNotice}
        />
        <QboConnectionCard
          status={status}
          testResult={testResult}
          isStarting={isStarting}
          canConnect={allows(can.qboConnection.write)}
          canDisconnect={allows(can.qboConnectionRevocation.write)}
          onConnectAction={handleConnect}
          onDisconnectAction={disconnect}
          onTestAction={testConnection}
        />
      </div>
    </div>
  );
}
