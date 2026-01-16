"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Button } from "@/style/components/Button";
import { Input } from "@/style/components/Input";
import { Label } from "@/style/components/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/Card";
import { CenteredContainer } from "@/style/components/Containers";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";

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

    requestPasswordReset({
      userName,
      loadingMsg: "Submitting request...",
    });
  };

  return (
    <CenteredContainer>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {status === "success"
              ? "Request Received"
              : "Enter your username to request a password reset."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" ? (
            <div className="space-y-4 text-center">
              <div className="rounded-md bg-sg-green-bg p-4 text-sm text-sg-green-brdr">
                <p>
                  If an account exists for <strong>{userName}</strong>, a
                  request has been sent to your administrator.
                </p>
                <p className="mt-2">
                  Please contact your manager to complete the reset process.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
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
              </div>
              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="link" className="text-slate-600">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </CenteredContainer>
  );
}
