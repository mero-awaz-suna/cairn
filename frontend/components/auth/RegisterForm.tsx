"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithJwt } from "@/lib/auth-client";

export default function RegisterForm() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const remember = formData.get("remember") === "on";

    if (!fullName || !email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await registerWithJwt({ fullName, email, password }, remember);
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
        <label className="auth-label" htmlFor="register-name">
          Full Name
        </label>
        <input
          className="auth-input"
          id="register-name"
          name="fullName"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          required
          disabled={isSubmitting}
        />
      </div>

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
        <input
          className="auth-input"
          id="register-password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="register-confirm-password">
          Confirm Password
        </label>
        <input
          className="auth-input"
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="auth-meta-row">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#a7dca2]"
            name="remember"
            disabled={isSubmitting}
          />
          <span>Keep me signed in</span>
        </label>
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
