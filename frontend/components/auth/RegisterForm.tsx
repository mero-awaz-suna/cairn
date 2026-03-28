"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithJwt } from "@/lib/auth-client";

export default function RegisterForm() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await registerWithJwt({ email, password }, true);
      router.push("/");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your account right now.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-5" noValidate onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="register-email">
          Email
        </label>
        <input
          className="auth-input"
          id="register-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="register-password">
          Password
        </label>
        <div className="auth-password-wrap">
          <input
            className="auth-input auth-input-with-toggle"
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            autoComplete="new-password"
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

      <p className="mt-3 text-[0.79rem] leading-relaxed text-stone-200/85">
        By signing up, you agree to our terms and privacy commitment. We only
        use your data to support your progress.
      </p>

      {errorMessage ? <p className="auth-error-text">{errorMessage}</p> : null}

      <button
        type="submit"
        className="hover:cursor-pointer auth-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Start My Journey"}
      </button>
    </form>
  );
}
