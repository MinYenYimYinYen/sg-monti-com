"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { api } from "@/lib/api/api";
import { handleError } from "@/lib/errors/errorHandler";
import { AppError } from "@/lib/errors/AppError";
import { DataResponse } from "@/lib/api/types/responses";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { useQboConnection } from "@/app/qbo/connection/useQboConnection";
import { qboConnectionSelect } from "@/app/qbo/connection/qboConnectionSelect";
import { QboConnectionNotices } from "@/app/qbo/connection/_components/QboConnectionNotices";
import { QboConnectionCard } from "@/app/qbo/connection/_components/QboConnectionCard";
import { QBO_CONNECTION_PAGE_PATH } from "@/app/qbo/_lib/auth/qboOAuthUtils";

// The one place the status fetch is triggered (it forces a refresh), so keep the hook here only.
export function QboConnectionPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useSelector(authSelect.role);
  const status = useSelector(qboConnectionSelect.status);
  const revocationUnconfirmed = useSelector(qboConnectionSelect.revocationUnconfirmed);
  const { disconnect, dismissRevocationNotice } = useQboConnection();
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

  if (role !== "admin") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-2xl">
          <Alert variant="destructive">
            <AlertTitle>Admins only</AlertTitle>
            <AlertDescription>Only an admin can manage the QuickBooks connection.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
          isStarting={isStarting}
          onConnectAction={handleConnect}
          onDisconnectAction={disconnect}
        />
      </div>
    </div>
  );
}
