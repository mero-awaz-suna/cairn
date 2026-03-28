import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Register | Cairn",
  description: "Registration page for Cairn users.",
};

export default function RegisterPage() {
  return (
    <main className="auth-screen">
      <section className="auth-shell">
        <div className="auth-glass">
          {/* This badge gives an immediate emotional cue: this screen is about starting something hopeful. */}
          <div className="flex items-center justify-between gap-3">
            <div className="auth-badge" aria-hidden="true">
              <span className="auth-stone" />
              <span>New Path</span>
            </div>
            <p className="text-[0.73rem] text-stone-200/85">Cairn</p>
          </div>

          {/* The headline and helper copy are balanced to stay readable even when the keyboard is open on small screens. */}
          <header className="mt-4">
            <h1 className="auth-heading">Create Account</h1>
            <p className="auth-subtext">
              Build your profile in less than a minute, then begin your
              seven-day rhythm.
            </p>
          </header>

          {/* Inputs are arranged in a single column first because that pattern is more reliable on smartphone widths. */}
          <form className="mt-5" noValidate>
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
              />
            </div>

            {/* Terms copy is intentionally plain-language so it feels understandable instead of legal-heavy. */}
            <p className="mt-3 text-[0.79rem] leading-relaxed text-stone-200/85">
              By signing up, you agree to our terms and privacy commitment. We
              only use your data to support your progress.
            </p>

            <button type="submit" className="hover:cursor-pointer auth-submit">
              Start My Journey
            </button>
          </form>

          <p className="auth-footnote">
            Already have an account?{" "}
            <Link href="/login" className="auth-link">
              Log in instead
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}