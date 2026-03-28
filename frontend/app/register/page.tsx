import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

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

          <RegisterForm />

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