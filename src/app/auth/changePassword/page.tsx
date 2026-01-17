"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Button } from "@/style/components/Button";
import { Input } from "@/style/components/Input";
import { Label } from "@/style/components/Label";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { AuthCard } from "@/style/components/AuthCard";
import { FormGroup } from "@/style/components/FormGroup";

export default function ChangePasswordPage() {
  const { changePassword, logout } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const user = useSelector(authSelect.user);

  // Redirect if password change is successful (flag cleared)
  useEffect(() => {
    if (user && !user.mustChangePassword) {
      toast.success("Password updated successfully");
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    // We don't need to check the result here because the useEffect above
    // will handle the redirect when the Redux state updates.
    changePassword({
      newPassword: password,
      loadingMsg: "Updating password...",
    });
  };

  return (
    <AuthCard
      title="Change Password"
      description="Your account requires a password change."
      footer={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout({ loadingMsg: "Logging out..." })}
        >
          Logout
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormGroup>
          <Label htmlFor="password">New Password</Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
            autoFocus
            autoComplete="new-password"
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </FormGroup>
        <Button type="submit" className="w-full">
          Update Password
        </Button>
      </form>
    </AuthCard>
  );
}
