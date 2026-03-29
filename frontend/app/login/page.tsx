import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | Cairn",
  description: "Login page for Cairn users.",
};

export default function LoginPage() {
  return (
    <main className="auth-screen">
      <section className="auth-shell">
        <div className="auth-glass">
          {/* This top row is intentionally light and calm so people instantly understand where they are. */}
          <div className="flex items-center justify-between gap-3">
            <div className="auth-badge" aria-hidden="true">
              <span className="auth-stone" />
              <span>Welcome </span>
            </div>
            <p className="auth-brand">Cairn</p>
          </div>

          {/* Keep the opening copy short, especially on phones, so the form remains visible without overwhelming the screen. */}
          <header className="mt-4">
            <h1 className="auth-heading">Log In</h1>
            <p className="auth-subtext">
              Pick up where you left off. Your progress, reflections, and
              routines are waiting.
            </p>
          </header>

          <LoginForm />

          <p className="auth-footnote">
            New here?{" "}
            <Link href="/register" className="auth-link">
              Create your account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}