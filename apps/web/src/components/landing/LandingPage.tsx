"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import CairnLogo from "./CairnLogo";

// ── Animation presets ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.8, delay: i * 0.12, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ── Section wrapper with scroll-triggered reveal ─────────────────────────────
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const start = performance.now();
    const duration = 1800;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ── Floating Nav ────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0D1A10]/90 backdrop-blur-2xl shadow-[0_1px_40px_rgba(0,0,0,0.35)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div whileHover={{ rotate: 8 }} transition={{ type: "spring", stiffness: 300 }}>
            <CairnLogo size={28} />
          </motion.div>
          <span className="text-[#F2EAD8] text-lg tracking-[0.04em]" style={{ fontFamily: "var(--font-display)" }}>
            Cairn
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="#how-it-works"
            className="hidden sm:block text-[#F2EAD8]/60 hover:text-[#F2EAD8] text-[13px] font-medium transition-colors duration-300 px-3"
          >
            How It Works
          </a>
          <a
            href="#safety"
            className="hidden sm:block text-[#F2EAD8]/60 hover:text-[#F2EAD8] text-[13px] font-medium transition-colors duration-300 px-3"
          >
            Safety
          </a>
          <Link
            href="/login"
            className="px-5 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-300 bg-[#F2EAD8] text-[#0D1A10] hover:bg-white hover:shadow-[0_0_20px_rgba(242,234,216,0.3)] active:scale-[0.96]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.08]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
      {/* Parallax mountain background */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80')",
          y: bgY,
          scale,
        }}
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A10]/65 via-[#2C3E2F]/50 via-[65%] to-[#0D1A10]/98" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 35%, transparent 0%, rgba(13,26,16,0.55) 100%)" }} />

      <motion.div style={{ opacity }} className="relative z-10 text-center max-w-[700px] px-6 pt-28 pb-36 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-8"
        >
          <CairnLogo size={72} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-[#F2EAD8] text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.1] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Speak your storm.<br />
          <span className="text-[#8FB996]">Find your circle.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-[#F2EAD8]/75 text-[clamp(0.95rem,2.2vw,1.15rem)] leading-[1.75] max-w-[500px] mb-12 font-light"
        >
          A voice journal that knows when you need people — and finds exactly the right ones.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/login">
            <motion.span
              whileHover={{ y: -2, boxShadow: "0 12px 50px rgba(242,234,216,0.25)" }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-10 py-4 rounded-full bg-[#F2EAD8] text-[#0D1A10] text-[15px] font-bold tracking-[0.01em] shadow-[0_4px_30px_rgba(0,0,0,0.3)] cursor-pointer transition-colors duration-300 hover:bg-white"
            >
              Start Your Journey
            </motion.span>
          </Link>
          <a href="#how-it-works">
            <motion.span
              whileHover={{ y: -1, borderColor: "rgba(242,234,216,0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-10 py-4 rounded-full text-[#F2EAD8] text-[15px] font-medium border border-[#F2EAD8]/20 cursor-pointer transition-all duration-300 hover:bg-[#F2EAD8]/[0.06]"
            >
              See How It Works
            </motion.span>
          </a>
        </motion.div>
      </motion.div>

      {/* Feature pills — floating at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="relative z-10 w-full bg-[#0D1A10]/95 backdrop-blur-2xl border-t border-[#F2EAD8]/[0.07] py-7 px-6"
      >
        <div className="max-w-[850px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: "Voice Journal", sub: "60s daily check-in", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4" },
            { label: "AI Persona", sub: "learns who you are", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
            { label: "Matched Circle", sub: "4-6 real people", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
            { label: "Hope Summary", sub: "what helped, kept", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 + i * 0.1 }}
              className="flex items-center gap-3 md:flex-col md:items-center md:text-center"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full border border-[#F2EAD8]/10 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2EAD8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                  <path d={f.icon} />
                </svg>
              </div>
              <div>
                <p className="text-[#F2EAD8] text-[12px] md:text-[13px] font-semibold leading-tight">{f.label}</p>
                <p className="text-[#F2EAD8]/40 text-[10px] md:text-[11px] leading-tight mt-0.5">{f.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ── Stats strip ──────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section className="bg-[#6B8F71] py-10 md:py-12 px-6">
      <div className="max-w-[800px] mx-auto grid grid-cols-3 gap-4 text-center">
        {[
          { value: 60, suffix: "s", label: "Daily check-in" },
          { value: 3, suffix: "s", label: "To find your circle" },
          { value: 100, suffix: "%", label: "Anonymous" },
        ].map((s, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <p className="text-white text-[clamp(1.8rem,4vw,2.8rem)] font-light leading-none mb-1" style={{ fontFamily: "var(--font-display)" }}>
              <Counter target={s.value} suffix={s.suffix} />
            </p>
            <p className="text-white/60 text-[11px] md:text-[13px] font-medium tracking-wide uppercase">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", title: "You speak, not type", desc: "Record a 60-second voice note every day. No prompts, no forms. Just your voice, your words, your truth." },
    { num: "02", title: "Cairn builds your persona", desc: "AI quietly understands your stress patterns, challenges, and where you are in your recovery journey." },
    { num: "03", title: "Press \"I need people\"", desc: "Within seconds, Cairn finds 4-6 real, anonymous people who match your context and are available right now." },
    { num: "04", title: "Leave better than you entered", desc: "Get a personal summary of what helped. Your persona updates — so the next match is even better." },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-36 bg-[#F5F0EA]">
      <div className="max-w-[900px] mx-auto px-6">
        <Reveal className="text-center mb-16 md:mb-20">
          <span className="inline-block px-5 py-1.5 rounded-full border border-[#6B8F71]/20 text-[#6B8F71] text-[11px] font-semibold tracking-[0.15em] uppercase mb-5">
            How It Works
          </span>
          <h2
            className="text-[#2C2825] text-[clamp(1.8rem,4.5vw,2.8rem)] leading-[1.15]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four moments that<br className="hidden sm:block" /> change everything
          </h2>
        </Reveal>

        <div className="grid gap-5">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.08}>
              <motion.div
                whileHover={{ x: 6, borderColor: "rgba(107,143,113,0.35)" }}
                transition={{ duration: 0.25 }}
                className="flex gap-5 md:gap-8 items-start p-6 md:p-8 rounded-2xl bg-white border border-[#E8DFD3]/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-default"
              >
                <span
                  className="text-[#6B8F71]/30 text-[2.2rem] md:text-[2.8rem] font-light leading-none shrink-0 mt-0.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.num}
                </span>
                <div>
                  <h3 className="text-[#2C2825] text-[16px] md:text-[18px] font-bold mb-1.5 leading-snug">{step.title}</h3>
                  <p className="text-[#8B7E74] text-[13.5px] md:text-[15px] leading-[1.7]">{step.desc}</p>
                </div>
              </motion.div>
            </Reveal>
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
      icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 12s1.5 2 4 2 4-2 4-2",
    },
    {
      title: "Engineered Hope",
      desc: "Group composition guarantees someone who has been where you are — and found the other side.",
      icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4",
    },
    {
      title: "The Memory Wall",
      desc: "Past sessions don't disappear. Their positive essence becomes support for future strangers.",
      icon: "M3 3h18a0 0 0 0 1 0 0v18a0 0 0 0 1 0 0H3a0 0 0 0 1 0 0V3zM7 8h10M7 12h6M7 16h8",
    },
  ];

  return (
    <section className="py-24 md:py-36 bg-[#1A1816]">
      <div className="max-w-[1000px] mx-auto px-6">
        <Reveal className="text-center mb-16 md:mb-20">
          <span className="inline-block px-5 py-1.5 rounded-full border border-[#F2EAD8]/10 text-[#F2EAD8]/50 text-[11px] font-semibold tracking-[0.15em] uppercase mb-5">
            What Makes This Different
          </span>
          <h2
            className="text-[#F2EAD8] text-[clamp(1.8rem,4.5vw,2.8rem)] leading-[1.15]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three things nobody else does
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -6, borderColor: "rgba(143,185,150,0.35)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full p-8 rounded-2xl bg-gradient-to-b from-[#F2EAD8]/[0.05] to-transparent border border-[#F2EAD8]/[0.07] cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-[#6B8F71]/15 flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8FB996" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-[#F2EAD8] text-[17px] font-bold mb-3 leading-snug">{item.title}</h3>
                <p className="text-[#F2EAD8]/45 text-[14px] leading-[1.75]">{item.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Safety ───────────────────────────────────────────────────────────────────
function SafetySection() {
  const items = [
    { marker: "A", title: "No permanent identity", desc: "Groups dissolve after every session. Nothing stored about who said what." },
    { marker: "B", title: "AI circuit breaker", desc: "If sentiment turns harmful, the facilitator redirects — or surfaces crisis support immediately." },
    { marker: "C", title: "Positive-only memory", desc: "Past sessions are filtered by AI — only insights that helped, nothing that could re-trigger." },
  ];

  return (
    <section id="safety" className="py-24 md:py-36 bg-[#F5F0EA]">
      <div className="max-w-[1000px] mx-auto px-6">
        <Reveal className="text-center mb-16 md:mb-20">
          <span className="inline-block px-5 py-1.5 rounded-full border border-[#6B8F71]/20 text-[#6B8F71] text-[11px] font-semibold tracking-[0.15em] uppercase mb-5">
            Safety
          </span>
          <h2
            className="text-[#2C2825] text-[clamp(1.8rem,4.5vw,2.8rem)] leading-[1.15]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Anonymous by default.<br className="hidden sm:block" /> Safe by design.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <Reveal key={item.marker} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="h-full p-8 rounded-2xl bg-white border border-[#E8DFD3]/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-default"
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#6B8F71]/10 text-[#6B8F71] text-[13px] font-bold mb-6"
                >
                  {item.marker}
                </motion.span>
                <h3 className="text-[#2C2825] text-[17px] font-bold mb-3 leading-snug">{item.title}</h3>
                <p className="text-[#8B7E74] text-[14px] leading-[1.75]">{item.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <section ref={ref} className="relative py-32 md:py-40 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80')",
          y: bgY,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A10]/85 to-[#0D1A10]/95" />

      <Reveal className="relative z-10 text-center max-w-[600px] mx-auto px-6">
        <motion.div
          whileHover={{ rotate: 10 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-block mb-8"
        >
          <CairnLogo size={52} />
        </motion.div>
        <h2
          className="text-[#F2EAD8] text-[clamp(1.6rem,4vw,2.5rem)] leading-[1.2] mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mental health support that meets you at the moment you need it.
        </h2>
        <p className="text-[#F2EAD8]/55 text-[15px] leading-[1.75] mb-12 max-w-[480px] mx-auto">
          No waiting lists. No stigma. No commitment. Just a circle of people who get it, exactly when you need them.
        </p>
        <Link href="/login">
          <motion.span
            whileHover={{ y: -3, boxShadow: "0 16px 60px rgba(242,234,216,0.2)" }}
            whileTap={{ scale: 0.97 }}
            className="inline-block px-12 py-4 rounded-full bg-[#F2EAD8] text-[#0D1A10] text-[15px] font-bold shadow-[0_4px_30px_rgba(0,0,0,0.3)] cursor-pointer transition-colors duration-300 hover:bg-white"
          >
            Start Your Journey
          </motion.span>
        </Link>
      </Reveal>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0D1A10] border-t border-[#F2EAD8]/[0.05] py-10 px-6">
      <div className="max-w-[900px] mx-auto flex flex-col items-center gap-5">
        <div className="flex items-center gap-2.5">
          <CairnLogo size={22} />
          <span className="text-[#F2EAD8]/60 text-sm tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Cairn</span>
        </div>
        <p className="text-[#F2EAD8]/25 text-[13px] font-light" style={{ fontFamily: "var(--font-display)" }}>
          Speak your storm. Find your circle.
        </p>
        <div className="flex gap-8 text-[#F2EAD8]/25 text-[12px]">
          {["Privacy", "Terms", "Safety", "Contact"].map((l) => (
            <span key={l} className="hover:text-[#F2EAD8]/60 transition-colors duration-300 cursor-pointer">{l}</span>
          ))}
        </div>
        <p className="text-[#F2EAD8]/15 text-[11px] mt-1">2026 Cairn. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="overflow-x-hidden" style={{ scrollBehavior: "smooth" }}>
      <Nav />
      <Hero />
      <Stats />
      <HowItWorks />
      <Differentiators />
      <SafetySection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
