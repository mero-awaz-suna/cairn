"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import CairnLogo from "@/components/landing/CairnLogo";

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

  async function handleGoogleSignIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <div className="min-h-[100svh] bg-[#F5F0EA] flex flex-col items-center overflow-hidden">
      <div className="flex-shrink-0 h-[max(50px,7vh)]" />

      {/* Logo + tagline */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center px-6 mb-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
          className="mx-auto mb-5"
        >
          <CairnLogo size={56} />
        </motion.div>
        <h1
          className="text-[32px] leading-[1.1] text-[#2C2825] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cairn
        </h1>
        <p className="text-[15px] text-[#8B7E74] font-light leading-[1.6] max-w-[260px] mx-auto">
          You are not the only one carrying this.
        </p>
      </motion.div>

      {/* Memory Wall preview */}
      <div className="w-full max-w-[380px] px-6 space-y-3 mb-10">
        {SEED_MEMORIES.map((memory, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ x: 3 }}
            className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(44,40,37,0.04)] border-l-[3px] border-[#6B8F71] text-left"
          >
            <p
              className="text-[16px] text-[#2C2825] leading-[1.55]"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              &ldquo;{memory.quote}&rdquo;
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B8F71] bg-[rgba(107,143,113,0.1)] px-2.5 py-1 rounded-md">
                {memory.tag}
              </span>
              <span className="text-[12px] text-[#8B7E74]">
                <span className="font-semibold text-[#6B8F71]">{memory.count}</span> carrying this
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sign-in */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.8 }}
        className="w-full max-w-[380px] px-6 pb-10"
      >
        <p
          className="text-center text-[22px] text-[#2C2825] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your space is ready.
        </p>
        <p className="text-center text-[14px] text-[#8B7E74] font-light leading-[1.6] mb-6 max-w-[300px] mx-auto">
          We only use your account to keep this space yours. No one in Cairn knows who you are.
        </p>

        <motion.button
          onClick={handleGoogleSignIn}
          disabled={loading}
          whileHover={{ y: -1, boxShadow: "0 6px 24px rgba(44,40,37,0.08)" }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#E8DFD3] rounded-full px-6 py-[14px] text-[15px] font-semibold text-[#2C2825] shadow-[0_2px_12px_rgba(44,40,37,0.04)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </motion.button>

        <p className="mt-5 text-[11px] text-[#C9BFB2] leading-[1.5] text-center max-w-[280px] mx-auto">
          By continuing, you agree to our Terms of Service and Privacy Policy. Your entries are encrypted.
        </p>
      </motion.div>
    </div>
  );
}
