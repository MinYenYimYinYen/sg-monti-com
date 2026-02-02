"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { RegisterForm } from "@/app/auth/_types/authTypes";
import Link from "next/link";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Input } from "@/style/components/input";
import { toast } from "react-toastify";
import { AuthCard } from "@/app/auth/_components/AuthCard";
import { FormGroup } from "@/style/componentsLegacy/FormGroup";
import { InfoBox } from "@/style/componentsLegacy/InfoBox";
import { Label } from "@/style/components/label";
import {Button} from "@/style/components/button";

export default function RegisterPage() {
  const router = useRouter();
  const { register, checkEligibility, resetEligibility } = useAuth();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // STEP 1: Check Eligibility
  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.saId || !form.email) {
      toast.error("Please fill in all fields");
      return;
    }
    checkEligibility({
      saId: form.saId,
    });
  };

  // STEP 2: Complete Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    await register({
      ...form,
      role: "applied",
    });
  };

  // RENDER: Step 1 (Eligibility Check)
  if (!eligibility?.isValid) {
    return (
      <AuthCard
        title="Register"
        description="Enter your Employee ID and Email to verify eligibility."
        footer={
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-slate-900 hover:underline"
            >
              Login here
            </Link>
          </p>
        }
      >
        <form onSubmit={handleCheckEligibility} className="space-y-4">
          <FormGroup>
            <Label htmlFor="saId">SA ID (Employee ID)</Label>
            <Input
              type="text"
              id="saId"
              name="saId"
              value={form.saId}
              onChange={handleChange}
              required
              placeholder="e.g. 12345"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="email">Email Address</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </FormGroup>

          {eligibility?.checked && !eligibility.isValid && (
            <InfoBox variant="destructive">
              {eligibility.alreadyExists
                ? "An account with this ID already exists."
                : "Invalid Employee ID or Email. Please check your records."}
            </InfoBox>
          )}

          <Button type="submit" className="w-full">
            Verify & Continue
          </Button>
        </form>
      </AuthCard>
    );
  }

  // RENDER: Step 2 (Profile Creation)
  return (
    <AuthCard
      title="Complete Registration"
      description="Set up your profile and password."
      footer={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetEligibility()}
          className="w-full"
        >
          Back
        </Button>
      }
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="text-left">ID: {form.saId}</div>
          <div className="text-right">{form.email}</div>
        </div>

        <FormGroup>
          <Label htmlFor="userName">Username</Label>
          <Input
            type="text"
            id="userName"
            name="userName"
            value={form.userName}
            onChange={handleChange}
            required
            placeholder="Choose a username"
            autoComplete="username"
          />
        </FormGroup>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              type="text"
              id="firstName"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              autoComplete="given-name"
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              type="text"
              id="lastName"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              autoComplete="family-name"
            />
          </FormGroup>
        </div>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="Min 4 characters"
            autoComplete="new-password"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </FormGroup>

        <Button type="submit" className="w-full">
          Create Account
        </Button>
      </form>
    </AuthCard>
  );
}
