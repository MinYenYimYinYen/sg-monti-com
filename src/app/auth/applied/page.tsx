"use client";

import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Button } from "@/style/components/Button";
import { AuthCard } from "@/style/components/AuthCard";
import { InfoBox } from "@/style/components/InfoBox";

export default function AppliedPage() {
  const { logout } = useAuth();

  return (
    <AuthCard
      title="Account Pending"
      description="Your registration has been received."
      footer={
        <Button
          variant="outline"
          onClick={() => logout()}
        >
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
            Please contact your manager to have your account approved and role
            assigned.
          </p>
        </InfoBox>
      </div>
    </AuthCard>
  );
}
