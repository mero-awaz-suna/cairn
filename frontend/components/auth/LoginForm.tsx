"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { completeGoogleLoginFromUrl, loginWithGoogle } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const searchParams = useSearchParams();
  const googleError = searchParams.get("google_error");

  useEffect(() => {
    const result = completeGoogleLoginFromUrl(true);
    if (result.success) {
      router.push("/");
      router.refresh();
      return;
    }

    if (window.location.hash && !googleError) {
      setErrorMessage("Google callback received but session token was missing.");
    }
  }, [googleError, router]);

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await loginWithGoogle();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start Google login.";
      setErrorMessage(message);
      setIsSubmitting(false);
      return;
    } finally {
      // Keep submitting state while redirecting away.
    }
  }

  return (
    <form className="mt-5" noValidate>
      <div className="auth-field">
        <label className="auth-label" htmlFor="login-email">
          Email
        </label>
        <input
          className="auth-input"
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="login-password">
          Password
        </label>
        <input
          className="auth-input"
          id="login-password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="auth-meta-row flex-wrap">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#a7dca2]"
            name="remember"
            disabled={isSubmitting}
          />
          <span>Keep me signed in</span>
        </label>
        <Link href="#" className="auth-link">
          Forgot password?
        </Link>
      </div>

      {errorMessage ? <p className="auth-error-text">{errorMessage}</p> : null}
      {googleError ? <p className="auth-error-text">Google login failed: {googleError}</p> : null}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="hover:cursor-pointer auth-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Redirecting..." : "Login"}
      </button>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-300/40" />
        <span className="text-xs text-stone-400">or</span>
        <div className="flex-1 h-px bg-stone-300/40" />
      </div>

      <button
        type="button"
        onClick={loginWithGoogle}
        className="hover:cursor-pointer auth-submit mt-4 flex items-center justify-center gap-2 bg-white text-stone-800 border border-stone-200 hover:bg-stone-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
    </form>
  );
}
