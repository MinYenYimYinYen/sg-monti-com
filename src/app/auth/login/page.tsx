"use client";

import { Suspense } from "react";
import { LoginContent } from "@/app/auth/login/Login";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
