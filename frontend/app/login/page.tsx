import type { Metadata } from "next";
import Link from "next/link";

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
            <p className="text-[0.73rem] text-stone-200/85">Cairn</p>
          </div>

          {/* Keep the opening copy short, especially on phones, so the form remains visible without overwhelming the screen. */}
          <header className="mt-4">
            <h1 className="auth-heading">Log In</h1>
            <p className="auth-subtext">
              Pick up where you left off. Your progress, reflections, and
              routines are waiting.
            </p>
          </header>

          {/* This is a regular HTML form right now. Once your backend is ready, you can wire action/onSubmit here. */}
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
              />
            </div>

            {/* Small helper links are kept on one row but still wrap safely on narrow phones. */}
            <div className="auth-meta-row flex-wrap">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#a7dca2]"
                  name="remember"
                />
                <span>Keep me signed in</span>
              </label>
              <Link href="#" className="auth-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="hover:cursor-pointer auth-submit">
              Login
            </button>
          </form>

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