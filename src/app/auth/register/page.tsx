"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { RegisterForm } from "@/app/auth/_types/authTypes";
import Link from "next/link";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
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
import {toast} from "react-toastify";

export default function RegisterPage() {
  const router = useRouter();
  const { register, checkEligibility, resetEligibility } = useAuth();
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const eligibility = useSelector(authSelect.registrationEligibility);

  const [form, setForm] = useState<RegisterForm>({
    userName: "",
    firstName: "",
    lastName: "",
    saId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Declarative Redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetEligibility();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckEligibility = (e: React.FormEvent) => {
    e.preventDefault();
    checkEligibility({
      saId: form.saId,
      email: form.email,
      loadingMsg: "Checking eligibility...",
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    register({
      ...form,
      role: "applied", // Default role, API will move this to "applied" no matter what we put here
      loadingMsg: "Creating account...",
    });
  };

  // Step 1: Eligibility Check
  if (!eligibility?.isValid) {
    return (
      <CenteredContainer>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Step 1: Verify your Employee ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckEligibility} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saId">Employee ID (SA ID)</Label>
                <Input
                  type="text"
                  id="saId"
                  name="saId"
                  value={form.saId}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>

              {eligibility?.checked && !eligibility.isValid && (
                <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
                  {eligibility.alreadyExists
                    ? "This ID is already registered. Please login."
                    : "Invalid Employee ID or Email. Please try again."}
                </div>
              )}

              <Button type="submit" className="w-full">
                Check Eligibility
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:underline"
              >
                Login here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </CenteredContainer>
    );
  }

  // Step 2: Registration Form
  return (
    <CenteredContainer>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Complete Registration</CardTitle>
          <CardDescription className="text-center">
            Step 2: Set up your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">Username</Label>
              <Input
                type="text"
                id="userName"
                name="userName"
                value={form.userName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {/* Read-only fields for context */}
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>ID: {form.saId}</div>
              <div className="text-right">{form.email}</div>
            </div>

            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetEligibility()}
            className="text-muted-foreground"
          >
            Back to Step 1
          </Button>
        </CardFooter>
      </Card>
    </CenteredContainer>
  );
}
