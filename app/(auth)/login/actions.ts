"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { isGoogleAuthConfigured, logAuthEnvStatus } from "@/lib/auth-env";

export async function signInWithGoogle() {
  if (!isGoogleAuthConfigured()) {
    logAuthEnvStatus("google-signin");
    redirect("/login?error=google_not_configured");
  }
  await signIn("google", { redirectTo: "/" });
}
