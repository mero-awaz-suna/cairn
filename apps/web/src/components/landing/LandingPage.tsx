"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CairnLogo from "./CairnLogo";

// ── Floating Nav ────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0D1A10]/90 backdrop-blur-xl shadow-[0_1px_30px_rgba(0,0,0,0.3)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CairnLogo size={28} />
          <span className="text-[#F2EAD8] text-lg tracking-[0.04em]" style={{ fontFamily: "var(--font-display)" }}>
            Cairn
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-300 bg-[#F2EAD8]/10 text-[#F2EAD8] border border-[#F2EAD8]/20 hover:bg-[#F2EAD8]/20 hover:border-[#F2EAD8]/40 active:scale-[0.97]"
        >
          Sign In
        </Link>
      </div>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
      {/* Mountain background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80')",
        }}
      />
      {/* Green tint overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A10]/60 via-[#2C3E2F]/55 via-70% to-[#0D1A10]/97" />
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, rgba(13,26,16,0.5) 100%)" }} />

      <div className="relative z-10 text-center max-w-[680px] px-6 pt-24 pb-32 flex flex-col items-center">
        <div className="mb-6 animate-[fadeInUp_0.8s_ease-out]">
          <CairnLogo size={64} />
        </div>

        <h1
          className="text-[#F2EAD8] text-[clamp(2.2rem,5.5vw,3.8rem)] leading-[1.15] mb-6 animate-[fadeInUp_0.8s_ease-out_0.1s_both]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Speak your storm.<br />Find your circle.
        </h1>

        <p className="text-[#F2EAD8]/80 text-[clamp(0.95rem,2vw,1.1rem)] leading-[1.7] max-w-[480px] mb-10 font-light animate-[fadeInUp_0.8s_ease-out_0.25s_both]">
          A voice journal that knows when you need people — and finds exactly the right ones.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 animate-[fadeInUp_0.8s_ease-out_0.4s_both]">
          <Link
            href="/login"
            className="px-8 py-[14px] rounded-full bg-[#F2EAD8] text-[#0D1A10] text-[15px] font-semibold tracking-[0.01em] shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:bg-white hover:shadow-[0_8px_40px_rgba(242,234,216,0.25)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
          >
            Get Started
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-[14px] rounded-full text-[#F2EAD8] text-[15px] font-medium border border-[#F2EAD8]/25 hover:bg-[#F2EAD8]/10 hover:border-[#F2EAD8]/40 active:scale-[0.97] transition-all duration-300"
          >
            How It Works
          </a>
        </div>
      </div>

      {/* Feature bar */}
      <div className="relative z-10 w-full bg-[#0D1A10]/95 backdrop-blur-xl border-t border-[#F2EAD8]/10 py-8 px-6">
        <div className="max-w-[900px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: "mic", label: "Voice Recording", sub: "60-second check-ins" },
            { icon: "persona", label: "AI Persona", sub: "learns who you are" },
            { icon: "circle", label: "Balanced Circle", sub: "matched support" },
            { icon: "star", label: "Summary of Hope", sub: "what helped, kept" },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 text-center">
              <div className="w-11 h-11 rounded-full border border-[#F2EAD8]/15 flex items-center justify-center text-[#F2EAD8]/80">
                {f.icon === "mic" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>}
                {f.icon === "persona" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                {f.icon === "circle" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                {f.icon === "star" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              </div>
              <div>
                <p className="text-[#F2EAD8] text-[13px] font-semibold">{f.label}</p>
                <p className="text-[#F2EAD8]/50 text-[11px]">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "You speak, not type",
      desc: "Every day, record a 60-second voice note. No prompts, no forms. Just your voice, your words, your truth.",
    },
    {
      num: "02",
      title: "Cairn builds your persona",
      desc: "Over time, it quietly understands your stress level, challenges, and where you are in your journey.",
    },
    {
      num: "03",
      title: "Press \"I need people\"",
      desc: "Within seconds, Cairn finds 4-6 real, anonymous people who match your context and are available right now.",
    },
    {
      num: "04",
      title: "Leave better than you entered",
      desc: "Get a personal summary of what helped. Your persona updates — so the next match is even better.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#F5F0EA]">
      <div className="max-w-[900px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[#6B8F71]/20 text-[#6B8F71] text-[11px] font-semibold tracking-[0.15em] uppercase mb-4">
            How It Works
          </span>
          <h2
            className="text-[#2C2825] text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.2]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four moments that change everything
          </h2>
        </div>

        <div className="grid gap-6">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="group flex gap-5 md:gap-8 items-start p-6 md:p-8 rounded-2xl bg-white border border-[#E8DFD3] hover:border-[#6B8F71]/30 hover:shadow-[0_8px_40px_rgba(107,143,113,0.08)] transition-all duration-400"
            >
              <span className="text-[#6B8F71]/40 text-[2rem] md:text-[2.5rem] font-light leading-none shrink-0 mt-1" style={{ fontFamily: "var(--font-display)" }}>
                {step.num}
              </span>
              <div>
                <h3 className="text-[#2C2825] text-[17px] md:text-[19px] font-bold mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-[#8B7E74] text-[14px] md:text-[15px] leading-[1.7] font-normal">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Differentiators ──────────────────────────────────────────────────────────
function Differentiators() {
  const items = [
    {
      title: "Persona-Driven Matching",
      desc: "Not keywords or mood tags — a living model of who you are, built from your voice over days and weeks.",
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>,
    },
    {
      title: "Engineered Hope",
      desc: "The group composition guarantees someone who has been where you are — and found the other side.",
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>,
    },
    {
      title: "The Memory Wall",
      desc: "Past sessions don't disappear. Their positive essence lives on and becomes support for future strangers.",
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#2C2825]">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[#F2EAD8]/15 text-[#F2EAD8]/60 text-[11px] font-semibold tracking-[0.15em] uppercase mb-4">
            What Makes This Different
          </span>
          <h2
            className="text-[#F2EAD8] text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.2]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three things nobody else does
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl bg-[#F2EAD8]/[0.04] border border-[#F2EAD8]/[0.08] hover:border-[#6B8F71]/40 hover:bg-[#6B8F71]/[0.06] transition-all duration-400"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6B8F71]/15 flex items-center justify-center text-[#8FB996] mb-5 group-hover:bg-[#6B8F71]/25 transition-colors duration-300">
                {item.icon}
              </div>
              <h3 className="text-[#F2EAD8] text-[17px] font-bold mb-3">{item.title}</h3>
              <p className="text-[#F2EAD8]/55 text-[14px] leading-[1.7]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Safety ───────────────────────────────────────────────────────────────────
function Safety() {
  const items = [
    {
      marker: "A",
      title: "No permanent identity",
      desc: "Groups dissolve after every session. Nothing is stored about who said what.",
    },
    {
      marker: "B",
      title: "AI circuit breaker",
      desc: "If sentiment turns harmful, the facilitator redirects — or surfaces a crisis helpline immediately.",
    },
    {
      marker: "C",
      title: "Positive-only memory wall",
      desc: "Past sessions are filtered by AI — only insights that helped, nothing that could re-trigger.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#F5F0EA]">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[#6B8F71]/20 text-[#6B8F71] text-[11px] font-semibold tracking-[0.15em] uppercase mb-4">
            Safety
          </span>
          <h2
            className="text-[#2C2825] text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.2]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Anonymous by default. Safe by design.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.marker}
              className="p-8 rounded-2xl bg-white border border-[#E8DFD3] hover:border-[#6B8F71]/30 hover:shadow-[0_8px_40px_rgba(107,143,113,0.08)] transition-all duration-400"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#6B8F71]/10 text-[#6B8F71] text-[13px] font-bold mb-5">
                {item.marker}
              </span>
              <h3 className="text-[#2C2825] text-[17px] font-bold mb-3">{item.title}</h3>
              <p className="text-[#8B7E74] text-[14px] leading-[1.7]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A10]/80 to-[#0D1A10]/95" />

      <div className="relative z-10 text-center max-w-[600px] mx-auto px-6">
        <CairnLogo size={48} className="mx-auto mb-8" />
        <h2
          className="text-[#F2EAD8] text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.25] mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mental health support that meets you at the moment you need it.
        </h2>
        <p className="text-[#F2EAD8]/65 text-[15px] leading-[1.7] mb-10">
          No waiting lists. No stigma. No commitment. Just a circle of people who get it, exactly when you need them most.
        </p>
        <Link
          href="/login"
          className="inline-block px-10 py-4 rounded-full bg-[#F2EAD8] text-[#0D1A10] text-[15px] font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:bg-white hover:shadow-[0_8px_40px_rgba(242,234,216,0.25)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
        >
          Start Your Journey
        </Link>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0D1A10] border-t border-[#F2EAD8]/[0.06] py-10 px-6">
      <div className="max-w-[900px] mx-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <CairnLogo size={22} />
          <span className="text-[#F2EAD8]/70 text-sm" style={{ fontFamily: "var(--font-display)" }}>Cairn</span>
        </div>
        <p className="text-[#F2EAD8]/30 text-[13px]">Speak your storm. Find your circle.</p>
        <div className="flex gap-6 text-[#F2EAD8]/30 text-[12px]">
          <span className="hover:text-[#F2EAD8]/60 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-[#F2EAD8]/60 transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-[#F2EAD8]/60 transition-colors cursor-pointer">Safety</span>
          <span className="hover:text-[#F2EAD8]/60 transition-colors cursor-pointer">Contact</span>
        </div>
        <p className="text-[#F2EAD8]/20 text-[11px] mt-2">2026 Cairn. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Nav />
      <Hero />
      <HowItWorks />
      <Differentiators />
      <Safety />
      <FinalCTA />
      <Footer />
    </main>
  );
}
