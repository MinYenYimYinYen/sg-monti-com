"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Button } from "@/style/components/Button";
import { Input } from "@/style/components/Input";
import { Label } from "@/style/components/Label";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { AuthCard } from "@/style/components/AuthCard";
import { FormGroup } from "@/style/components/FormGroup";
import { InfoBox } from "@/style/components/InfoBox";

export default function ForgotPasswordPage() {
  const { requestPasswordReset, resetPasswordResetStatus } = useAuth();
  const status = useSelector(authSelect.passwordResetRequestStatus);
  const [userName, setUserName] = useState("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetPasswordResetStatus();
    };
  }, [resetPasswordResetStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    requestPasswordReset({ userName });
  };

  return (
    <AuthCard
      title="Reset Password"
      description={
        status === "success"
          ? "Request Received"
          : "Enter your username to request a password reset."
      }
      footer={
        <Button asChild variant="link" className="text-slate-600">
          <Link href="/auth/login">Back to Login</Link>
        </Button>
      }
    >
      {status === "success" ? (
        <div className="space-y-4 text-center">
          <InfoBox variant="success">
            <p>
              If an account exists for <strong>{userName}</strong>, a request
              has been sent to your administrator.
            </p>
            <p className="mt-2">
              Please contact your manager to complete the reset process.
            </p>
          </InfoBox>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormGroup>
            <Label htmlFor="userName">Username</Label>
            <Input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              placeholder="Enter your username"
              autoFocus
            />
          </FormGroup>
          <Button type="submit" className="w-full">
            Submit Request
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
