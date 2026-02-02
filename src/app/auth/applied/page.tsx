"use client";

import { useAuth } from "@/app/auth/_hooks/useAuth";
import { AuthCard } from "@/app/auth/_components/AuthCard";
import { InfoBox } from "@/style/componentsLegacy/InfoBox";
import {Button} from "@/style/components/button";

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
