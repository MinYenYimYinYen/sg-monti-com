"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { LoginForm } from "@/app/auth/_types/authTypes";
import Link from "next/link";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Button } from "@/style/components/Button";
import { Input } from "@/style/components/Input";
import { Label } from "@/style/components/Label";
import { AuthCard } from "@/style/components/AuthCard";
import { FormGroup } from "@/style/components/FormGroup";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const invalidCredentialsEntered = useSelector(
    authSelect.invalidCredentialsEntered,
  );

  const [form, setForm] = useState<LoginForm>({
    userName: "",
    password: "",
  });

  // Declarative Redirect
  useEffect(() => {
    if (isAuthenticated) {
      const from = searchParams.get("from") || "/";
      router.push(from);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      userName: form.userName,
      password: form.password,
      loadingMsg: "Logging in...",
    });
  };

  return (
    <AuthCard
      title="Login"
      description="Enter your credentials to access your account"
      footer={
        <>
          <p className="text-sm text-text-500">
            Don&#39;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-text-900 hover:underline"
            >
              Register here
            </Link>
          </p>

          {invalidCredentialsEntered && (
            <Link
              href="/auth/forgotPassword"
              className="text-sm font-medium text-accent-600 hover:underline"
            >
              Forgot Password?
            </Link>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormGroup>
          <Label htmlFor="userName">Username</Label>
          <Input
            type="text"
            id="userName"
            name="userName"
            value={form.userName}
            onChange={handleChange}
            required
            placeholder="Enter your username"
            autoComplete="username"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </FormGroup>

        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
