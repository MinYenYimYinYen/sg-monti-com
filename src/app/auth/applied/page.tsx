"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { AuthCard } from "@/app/auth/_components/AuthCard";
import { InfoBox } from "@/style/componentsLegacy/InfoBox";
import { Button } from "@/style/components/button";

export default function AppliedPage() {
  const { logout, recheckAccess } = useAuth();
  const [stillPending, setStillPending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // The pending state is a claim in the session cookie, so after an approval the cookie has to be
  // re-issued. A full page load follows, not a client navigation: the permissions already in the
  // store are the empty ones from before the approval.
  async function handleCheckAgain() {
    setIsChecking(true);
    setStillPending(false);
    try {
      const { hasCapabilities } = await recheckAccess().unwrap();
      if (hasCapabilities) {
        window.location.assign("/");
        return;
      }
      setStillPending(true);
    } catch {
      // The failure is already shown as a toast by the thunk.
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <AuthCard
      title="Account Pending"
      description="Your registration has been received."
      footer={
        <Button variant="outline" onClick={() => logout()}>
          Logout
        </Button>
      }
    >
      <div className="text-center space-y-4">
        <InfoBox>
          <p>
            Thank you for registering. Your account is currently under review.
          </p>
          <p className="mt-2">
            Please contact your manager to have your account approved and
            permissions assigned.
          </p>
        </InfoBox>
        <Button disabled={isChecking} onClick={handleCheckAgain}>
          I have been approved: check again
        </Button>
        {stillPending && (
          <p className="text-sm text-muted-foreground">
            No permissions have been assigned to your account yet.
          </p>
        )}
      </div>
    </AuthCard>
  );
}