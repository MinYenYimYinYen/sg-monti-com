import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useEffect, useState } from "react";
import { LoginForm } from "@/app/auth/_types/authTypes";
import { AuthCard } from "@/app/auth/_components/AuthCard";
import Link from "next/link";
import { FormGroup } from "@/components/FormGroup";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/style/components/button";

export function LoginContent() {
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
  const [showPassword, setShowPassword] = useState(false);

  // Hard navigation ensures the new httpOnly cookie is sent with the request,
  // which is required for the proxy to recognize the authenticated session.
  // client-side router.push does not trigger a new server request in production.
  useEffect(() => {
    if (isAuthenticated) {
      const from = searchParams.get("from") || "/";
      window.location.href = from;
    }
  }, [isAuthenticated, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUserName = form.userName.trim();
    login({
      userName: trimmedUserName,
      password: form.password,
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
            autoCapitalize={"off"}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              autoCapitalize={"off"}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Eye size={16} className={"text-muted-foreground"} /> : <EyeOff size={16} className={"text-muted-foreground/50"} />}
            </button>
          </div>
        </FormGroup>

        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </AuthCard>
  );
}
