"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

const SEED_MEMORIES = [
  {
    quote: "The distance between where I am and where my family thinks I should be — that gap has its own gravity.",
    tag: "FAMILY WEIGHT",
    count: 247,
  },
  {
    quote: "I learned to say I'm fine in two languages and mean it in neither.",
    tag: "BELONGING",
    count: 183,
  },
  {
    quote: "Every rejection email isn't just a no — it's a countdown on a clock nobody else can see.",
    tag: "CAREER PRESSURE",
    count: 312,
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    // Trust before ask — show Memory Wall first, then reveal sign-in
    const t1 = setTimeout(() => setShowContent(true), 300);
    const t2 = setTimeout(() => setShowSignIn(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col items-center overflow-hidden">
      {/* Top space */}
      <div className="flex-shrink-0 h-[max(60px,8vh)]" />

      {/* Logo + tagline */}
      <div
        className="text-center px-6 mb-10"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 600ms cubic-bezier(0,0,0.2,1), transform 600ms cubic-bezier(0,0,0.2,1)",
        }}
      >
        <div className="w-[64px] h-[64px] mx-auto rounded-full bg-moss flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(107,143,113,0.4)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
        </div>
        <h1 className="font-display text-[36px] leading-[1.1] text-stone mb-3">
          Cairn
        </h1>
        <p className="text-[15px] text-dusk font-light leading-[1.6] max-w-[260px] mx-auto">
          You are not the only one carrying this.
        </p>
      </div>

      {/* Memory Wall preview — value shown before anything is asked */}
      <div className="w-full max-w-[380px] px-6 space-y-3 mb-10">
        {SEED_MEMORIES.map((memory, i) => (
          <div
            key={i}
            className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)] border-l-[3px] border-moss text-left"
            style={{
              opacity: showContent ? 1 : 0,
              transform: showContent ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 500ms cubic-bezier(0,0,0.2,1) ${400 + i * 120}ms, transform 500ms cubic-bezier(0,0,0.2,1) ${400 + i * 120}ms`,
            }}
          >
            <p className="font-hand text-[17px] text-stone leading-[1.5]">
              &ldquo;{memory.quote}&rdquo;
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-moss bg-[var(--moss-glow)] px-2 py-[3px] rounded-[4px]">
                {memory.tag}
              </span>
              <span className="text-[12px] text-dusk">
                <span className="font-semibold text-moss">{memory.count}</span> carrying this
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Sign-in area — fades in after Memory Wall has landed */}
      <div
        className="w-full max-w-[380px] px-6 pb-10"
        style={{
          opacity: showSignIn ? 1 : 0,
          transform: showSignIn ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 600ms cubic-bezier(0,0,0.2,1), transform 600ms cubic-bezier(0,0,0.2,1)",
        }}
      >
        {/* "Your space is ready" — from design system onboarding spec */}
        <p className="text-center font-display text-[22px] text-stone mb-2">
          Your space is ready.
        </p>
        <p className="text-center text-[14px] text-dusk font-light leading-[1.6] mb-6 max-w-[300px] mx-auto">
          We only use your account to keep this space yours. No one in Cairn knows who you are.
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-sand rounded-full px-6 py-[14px] text-[15px] font-semibold text-stone shadow-[0_2px_12px_rgba(44,40,37,0.05)] hover:shadow-[0_6px_24px_rgba(44,40,37,0.08)] hover:-translate-y-[1px] active:scale-[0.97] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <p className="mt-5 text-[11px] text-cloud leading-[1.5] text-center max-w-[280px] mx-auto">
          By continuing, you agree to our Terms of Service and Privacy Policy. Your journal entries and burden drops are encrypted.
        </p>
      </div>
    </div>
  );
}
