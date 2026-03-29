"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  completeGoogleLoginFromUrl,
  loginWithGoogle,
  loginWithJwt,
} from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const googleError = searchParams.get("google_error");
  const nextPath = useMemo(() => {
    const next = searchParams.get("next")?.trim();
    if (!next || !next.startsWith("/")) {
      return "/";
    }

    return next;
  }, [searchParams]);

  useEffect(() => {
    const result = completeGoogleLoginFromUrl(true);
    if (result.success) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    if (window.location.hash && !googleError) {
      setErrorMessage("Google callback received but session token was missing.");
    }
  }, [googleError, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage("Please provide both email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await loginWithJwt({ email, password }, true);
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to log in right now.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await loginWithGoogle(nextPath);
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
    <form className="mt-5" noValidate onSubmit={handleSubmit}>
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
        <div className="auth-password-wrap">
          <input
            className="auth-input auth-input-with-toggle"
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={isSubmitting}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M3 3l18 18M10.58 10.58a2 2 0 1 0 2.84 2.84M9.88 5.09A10.94 10.94 0 0 1 12 4.9c5.05 0 9.27 3.11 10.8 7.5a11.8 11.8 0 0 1-4.06 5.59M6.61 6.61A11.8 11.8 0 0 0 1.2 12.4c.64 1.84 1.82 3.46 3.39 4.68"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M1.2 12.4C2.73 8.01 6.95 4.9 12 4.9s9.27 3.11 10.8 7.5c-1.53 4.39-5.75 7.5-10.8 7.5S2.73 16.79 1.2 12.4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12.4" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="auth-meta-row">
        <Link href="#" className="auth-link">
          Forgot password?
        </Link>
      </div>

      {errorMessage ? <p className="auth-error-text">{errorMessage}</p> : null}
      {googleError ? <p className="auth-error-text">Google login failed: {googleError}</p> : null}
      <button
        type="submit"
        className="hover:cursor-pointer auth-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-400/45" />
        <span className="text-xs font-semibold text-stone-600">or</span>
        <div className="flex-1 h-px bg-stone-400/45" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="hover:cursor-pointer auth-submit mt-4 flex items-center justify-center gap-2 bg-white text-stone-800 border border-stone-200 hover:bg-stone-50"
        disabled={isSubmitting}
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
