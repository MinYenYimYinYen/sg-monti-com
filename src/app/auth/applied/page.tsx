"use client";

import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Button } from "@/style/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/style/components/Card";
import { CenteredContainer } from "@/style/components/Containers";

export default function AppliedPage() {
  const { logout } = useAuth();

  return (
    <CenteredContainer>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Account Pending</CardTitle>
          <CardDescription className="text-center">
            Your registration has been received.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="rounded-md bg-sg-blue-bg p-4 text-sm text-sg-blue-brdr">
            <p>
              Thank you for registering. Your account is currently under review.
            </p>
            <p className="mt-2">
              Please contact your manager to have your account approved and role
              assigned.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="outline"
            onClick={() => logout({ loadingMsg: "Logging out..." })}
          >
            Logout
          </Button>
        </CardFooter>
      </Card>
    </CenteredContainer>
  );
}
