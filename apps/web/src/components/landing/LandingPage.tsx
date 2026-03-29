"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
} from "framer-motion";
import CairnLogo from "./CairnLogo";

// ── Scroll-triggered reveal ──────────────────────────────────────────────────
function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const initial = {
    opacity: 0,
    y: direction === "up" ? 40 : 0,
    x: direction === "left" ? -30 : direction === "right" ? 30 : 0,
  };

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
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
    const duration = 2200;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ── Glowing dot for visual flair ─────────────────────────────────────────────
function GlowDot({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.2, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute w-2 h-2 rounded-full bg-[#8FB996] blur-[2px] ${className}`}
    />
  );
}

// ── Floating Nav ────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 50));

  return (
    <motion.nav
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? "bg-[#0D1A10]/85 backdrop-blur-2xl shadow-[0_2px_60px_rgba(0,0,0,0.3)] py-0"
          : "bg-transparent py-1"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <CairnLogo size={26} />
          </motion.div>
          <span
            className="text-[#F2EAD8] text-[17px] tracking-[0.05em] group-hover:text-white transition-colors duration-300"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cairn
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href="#how-it-works"
            className="hidden md:block text-[#F2EAD8]/50 hover:text-[#F2EAD8] text-[13px] font-medium transition-all duration-300 px-4 py-2 rounded-full hover:bg-[#F2EAD8]/[0.06]"
          >
            How It Works
          </a>
          <a
            href="#safety"
            className="hidden md:block text-[#F2EAD8]/50 hover:text-[#F2EAD8] text-[13px] font-medium transition-all duration-300 px-4 py-2 rounded-full hover:bg-[#F2EAD8]/[0.06]"
          >
            Safety
          </a>
          <div className="w-px h-5 bg-[#F2EAD8]/10 mx-2 hidden md:block" />
          <Link href="/login">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-5 py-[9px] rounded-full text-[13px] font-semibold tracking-wide bg-[#F2EAD8] text-[#0D1A10] hover:bg-white transition-all duration-300 shadow-[0_2px_12px_rgba(242,234,216,0.15)] hover:shadow-[0_4px_24px_rgba(242,234,216,0.25)] cursor-pointer"
            >
              Get Started
            </motion.span>
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
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.45], [0, -40]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
      {/* Parallax background */}
      <motion.div
        className="absolute inset-[-10%] bg-cover bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80')",
          y: bgY,
          scale: bgScale,
        }}
      />

      {/* Layered overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A10]/70 via-[#1a2e1d]/45 via-[55%] to-[#0D1A10]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_35%,transparent_0%,rgba(13,26,16,0.6)_100%)]" />

      {/* Film grain texture */}
      <div
        className="absolute inset-0 opacity-[0.045] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 512 512\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.75\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23n)\"/%3E%3C/svg%3E')",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Ambient glow dots */}
      <GlowDot className="top-[20%] left-[15%]" />
      <GlowDot className="top-[35%] right-[20%]" />
      <GlowDot className="bottom-[30%] left-[25%]" />

      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-10 text-center max-w-[720px] px-6 pt-28 pb-32 flex flex-col items-center"
      >
        {/* Logo with glow */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 blur-2xl bg-[#8FB996]/20 rounded-full scale-150" />
          <CairnLogo size={72} className="relative" />
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-7">
          <motion.h1
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#F2EAD8] text-[clamp(2.2rem,6.5vw,4.5rem)] leading-[1.05] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Speak your storm.
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-8">
          <motion.h1
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#8FB996] text-[clamp(2.2rem,6.5vw,4.5rem)] leading-[1.05] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Find your circle.
          </motion.h1>
        </div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="text-[#F2EAD8]/70 text-[clamp(0.95rem,2vw,1.12rem)] leading-[1.8] max-w-[460px] mb-12 font-light"
        >
          A voice journal that knows when you need people — and finds exactly the right ones.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/login">
            <motion.span
              whileHover={{ y: -3, boxShadow: "0 16px 60px rgba(242,234,216,0.2)" }}
              whileTap={{ scale: 0.96 }}
              className="inline-block px-10 py-[15px] rounded-full bg-[#F2EAD8] text-[#0D1A10] text-[15px] font-bold tracking-[0.005em] shadow-[0_4px_30px_rgba(0,0,0,0.25)] cursor-pointer transition-colors duration-300 hover:bg-white"
            >
              Start Your Journey
            </motion.span>
          </Link>
          <a href="#how-it-works">
            <motion.span
              whileHover={{ y: -2, backgroundColor: "rgba(242,234,216,0.08)" }}
              whileTap={{ scale: 0.96 }}
              className="inline-block px-10 py-[15px] rounded-full text-[#F2EAD8]/80 text-[15px] font-medium border border-[#F2EAD8]/15 cursor-pointer transition-all duration-300"
            >
              See How It Works
            </motion.span>
          </a>
        </motion.div>
      </motion.div>

      {/* Feature strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative z-10 w-full bg-[#0D1A10]/90 backdrop-blur-2xl border-t border-[#F2EAD8]/[0.06] py-6 px-6"
      >
        <div className="max-w-[820px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Voice Journal", sub: "60s daily check-in", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4" },
            { label: "AI Persona", sub: "learns who you are", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
            { label: "Matched Circle", sub: "4-6 real people", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
            { label: "Hope Summary", sub: "what helped, kept", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 + i * 0.12 }}
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 md:flex-col md:items-center md:text-center p-2 rounded-xl transition-colors duration-300 hover:bg-[#F2EAD8]/[0.03] cursor-default"
            >
              <div className="w-10 h-10 rounded-full border border-[#F2EAD8]/[0.08] flex items-center justify-center shrink-0 bg-[#F2EAD8]/[0.02]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8FB996" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
                  <path d={f.icon} />
                </svg>
              </div>
              <div>
                <p className="text-[#F2EAD8]/90 text-[12px] md:text-[12.5px] font-semibold leading-tight">{f.label}</p>
                <p className="text-[#F2EAD8]/30 text-[10px] md:text-[10.5px] leading-tight mt-0.5">{f.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Scroll indicator — hidden on small screens */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="hidden md:flex absolute bottom-[100px] left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[20px] h-[32px] rounded-full border border-[#F2EAD8]/15 flex justify-center pt-[7px]"
        >
          <motion.div
            animate={{ opacity: [0.4, 0.9, 0.4], y: [0, 7, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-[2.5px] h-[6px] rounded-full bg-[#F2EAD8]/40"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section className="relative bg-[#0D1A10] py-14 md:py-16 px-6 overflow-hidden">
      {/* Gradient line at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#6B8F71]/50 to-transparent" />

      <div className="max-w-[700px] mx-auto grid grid-cols-3 gap-4 text-center">
        {[
          { value: 60, suffix: "s", label: "Daily check-in" },
          { value: 3, suffix: "s", label: "To find your circle" },
          { value: 100, suffix: "%", label: "Anonymous & safe" },
        ].map((s, i) => (
          <Reveal key={i} delay={i * 0.12} className="relative">
            <p
              className="text-[#8FB996] text-[clamp(2rem,5vw,3.2rem)] font-light leading-none mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Counter target={s.value} suffix={s.suffix} />
            </p>
            <p className="text-[#F2EAD8]/35 text-[10px] md:text-[12px] font-medium tracking-[0.12em] uppercase">{s.label}</p>
          </Reveal>
        ))}
      </div>

      {/* Gradient line at bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#6B8F71]/30 to-transparent" />
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "You speak, not type",
      desc: "Record a 60-second voice note every day. No prompts, no forms. Just your voice, your words, your truth.",
      accent: "#6B8F71",
    },
    {
      num: "02",
      title: "Cairn builds your persona",
      desc: "AI quietly understands your stress patterns, challenges, and where you are in your recovery journey.",
      accent: "#8FB996",
    },
    {
      num: "03",
      title: "Press \"I need people\"",
      desc: "Within seconds, Cairn finds 4-6 anonymous people who match your context and are available right now.",
      accent: "#6B8F71",
    },
    {
      num: "04",
      title: "Leave better than you entered",
      desc: "Get a summary of what helped. Your persona updates — so the next match is even better.",
      accent: "#8FB996",
    },
  ];

  return (
    <section id="how-it-works" className="py-28 md:py-40 bg-[#F5F0EA] relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#6B8F71]/[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />

      <div className="max-w-[860px] mx-auto px-6 relative">
        <Reveal className="text-center mb-20">
          <span className="inline-block px-5 py-2 rounded-full border border-[#6B8F71]/15 text-[#6B8F71] text-[10.5px] font-semibold tracking-[0.18em] uppercase mb-6">
            How It Works
          </span>
          <h2
            className="text-[#2C2825] text-[clamp(1.8rem,4.5vw,2.8rem)] leading-[1.12]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four moments that<br className="hidden sm:block" /> change everything
          </h2>
        </Reveal>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[27px] md:left-[35px] top-8 bottom-8 w-px bg-gradient-to-b from-[#6B8F71]/20 via-[#6B8F71]/10 to-transparent hidden md:block" />

          <div className="grid gap-4">
            {steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.08}>
                <motion.div
                  whileHover={{
                    x: 4,
                    backgroundColor: "rgba(255,255,255,1)",
                    boxShadow: "0 8px 40px rgba(107,143,113,0.08)",
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex gap-5 md:gap-7 items-start p-5 md:p-7 rounded-2xl bg-white/70 border border-[#E8DFD3]/60 cursor-default"
                >
                  {/* Number badge */}
                  <div className="relative shrink-0">
                    <div
                      className="w-[54px] h-[54px] md:w-[62px] md:h-[62px] rounded-2xl flex items-center justify-center text-[#F2EAD8] text-[18px] md:text-[20px] font-light"
                      style={{ fontFamily: "var(--font-display)", backgroundColor: step.accent }}
                    >
                      {step.num}
                    </div>
                  </div>

                  <div className="pt-1">
                    <h3 className="text-[#2C2825] text-[16px] md:text-[18px] font-bold mb-1.5 leading-snug">{step.title}</h3>
                    <p className="text-[#8B7E74] text-[13.5px] md:text-[15px] leading-[1.75]">{step.desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
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
      icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14s1.5 2 4 2 4-2 4-2",
    },
    {
      title: "Engineered Hope",
      desc: "Group composition guarantees someone who has been where you are — and found the other side.",
      icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4",
    },
    {
      title: "The Memory Wall",
      desc: "Past sessions don't disappear. Their positive essence becomes support for future strangers.",
      icon: "M4 4h16v16H4zM7 8h10M7 12h6M7 16h8",
    },
  ];

  return (
    <section className="py-28 md:py-40 bg-[#141210] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#6B8F71]/[0.04] rounded-full blur-[100px]" />

      <div className="max-w-[1000px] mx-auto px-6 relative">
        <Reveal className="text-center mb-20">
          <span className="inline-block px-5 py-2 rounded-full border border-[#F2EAD8]/[0.08] text-[#F2EAD8]/40 text-[10.5px] font-semibold tracking-[0.18em] uppercase mb-6">
            What Makes This Different
          </span>
          <h2
            className="text-[#F2EAD8] text-[clamp(1.8rem,4.5vw,2.8rem)] leading-[1.12]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three things nobody else does
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <motion.div
                whileHover={{
                  y: -8,
                  borderColor: "rgba(143,185,150,0.3)",
                  transition: { duration: 0.3 },
                }}
                className="group h-full p-8 md:p-9 rounded-2xl bg-gradient-to-br from-[#F2EAD8]/[0.04] to-transparent border border-[#F2EAD8]/[0.06] cursor-default relative overflow-hidden"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#6B8F71]/0 to-[#6B8F71]/0 group-hover:from-[#6B8F71]/[0.04] group-hover:to-transparent transition-all duration-500 rounded-2xl" />

                <div className="relative">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.05 }}
                    className="w-14 h-14 rounded-2xl bg-[#6B8F71]/[0.1] border border-[#6B8F71]/[0.1] flex items-center justify-center mb-7 group-hover:bg-[#6B8F71]/[0.15] group-hover:border-[#6B8F71]/20 transition-all duration-400"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8FB996" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                  </motion.div>
                  <h3 className="text-[#F2EAD8] text-[17px] font-bold mb-3 leading-snug">{item.title}</h3>
                  <p className="text-[#F2EAD8]/40 text-[14px] leading-[1.8] group-hover:text-[#F2EAD8]/55 transition-colors duration-400">{item.desc}</p>
                </div>
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
    { marker: "A", title: "No permanent identity", desc: "Groups dissolve after every session. Nothing stored about who said what. Zero trace." },
    { marker: "B", title: "AI circuit breaker", desc: "If sentiment turns harmful, the facilitator redirects — or surfaces crisis support immediately." },
    { marker: "C", title: "Positive-only memory", desc: "Past sessions filtered by AI. Only insights that helped, nothing that could re-trigger." },
  ];

  return (
    <section id="safety" className="py-28 md:py-40 bg-[#F5F0EA] relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#6B8F71]/[0.03] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

      <div className="max-w-[1000px] mx-auto px-6 relative">
        <Reveal className="text-center mb-20">
          <span className="inline-block px-5 py-2 rounded-full border border-[#6B8F71]/15 text-[#6B8F71] text-[10.5px] font-semibold tracking-[0.18em] uppercase mb-6">
            Safety
          </span>
          <h2
            className="text-[#2C2825] text-[clamp(1.8rem,4.5vw,2.8rem)] leading-[1.12]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Anonymous by default.<br className="hidden sm:block" /> Safe by design.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <Reveal key={item.marker} delay={i * 0.1}>
              <motion.div
                whileHover={{
                  y: -6,
                  boxShadow: "0 12px 50px rgba(107,143,113,0.1)",
                  transition: { duration: 0.3 },
                }}
                className="group h-full p-8 md:p-9 rounded-2xl bg-white border border-[#E8DFD3]/70 cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-[#6B8F71]/8 border border-[#6B8F71]/10 flex items-center justify-center text-[#6B8F71] text-[13px] font-bold mb-7 group-hover:bg-[#6B8F71]/15 group-hover:border-[#6B8F71]/20 transition-all duration-400">
                  {item.marker}
                </div>
                <h3 className="text-[#2C2825] text-[17px] font-bold mb-3 leading-snug">{item.title}</h3>
                <p className="text-[#8B7E74] text-[14px] leading-[1.8]">{item.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Quote ────────────────────────────────────────────────────────────────────
function Quote() {
  return (
    <section className="py-20 md:py-28 bg-[#0D1A10] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(107,143,113,0.06)_0%,transparent_100%)]" />
      <Reveal className="max-w-[640px] mx-auto px-8 text-center relative">
        <svg className="mx-auto mb-6 text-[#6B8F71]/30" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 7H7a4 4 0 0 0-4 4v0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7zm10 0h-4a4 4 0 0 0-4 4v0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7z" />
        </svg>
        <p
          className="text-[#F2EAD8]/80 text-[clamp(1.1rem,2.5vw,1.4rem)] leading-[1.7] mb-6 font-light italic"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The person who helped me most wasn't a therapist. It was a stranger who said, "I carried that exact same weight last year."
        </p>
        <p className="text-[#8FB996]/60 text-[13px] tracking-wide">— Cairn user, Finding Ground stage</p>
      </Reveal>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <section ref={ref} className="relative py-32 md:py-44 overflow-hidden">
      <motion.div
        className="absolute inset-[-10%] bg-cover bg-center will-change-transform"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80')",
          y: bgY,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1A10]/80 via-[#0D1A10]/90 to-[#0D1A10]/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(107,143,113,0.08)_0%,transparent_100%)]" />

      <Reveal className="relative z-10 text-center max-w-[560px] mx-auto px-6">
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="inline-block mb-10"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-[#8FB996]/15 rounded-full scale-[2]" />
            <CairnLogo size={56} className="relative" />
          </div>
        </motion.div>

        <h2
          className="text-[#F2EAD8] text-[clamp(1.5rem,3.5vw,2.2rem)] leading-[1.25] mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mental health support that meets you at the moment you need it.
        </h2>
        <p className="text-[#F2EAD8]/45 text-[14.5px] leading-[1.8] mb-12 max-w-[460px] mx-auto">
          No waiting lists. No stigma. No commitment. Just a circle of people who get it.
        </p>

        <Link href="/login">
          <motion.span
            whileHover={{ y: -3, boxShadow: "0 20px 60px rgba(242,234,216,0.15)" }}
            whileTap={{ scale: 0.96 }}
            className="inline-block px-12 py-4 rounded-full bg-[#F2EAD8] text-[#0D1A10] text-[15px] font-bold shadow-[0_4px_30px_rgba(0,0,0,0.25)] cursor-pointer transition-colors duration-300 hover:bg-white"
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
    <footer className="bg-[#0A0F0B] border-t border-[#F2EAD8]/[0.04] py-12 px-6">
      <div className="max-w-[900px] mx-auto flex flex-col items-center gap-5">
        <div className="flex items-center gap-2.5">
          <CairnLogo size={20} />
          <span className="text-[#F2EAD8]/50 text-[14px] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Cairn</span>
        </div>
        <p
          className="text-[#F2EAD8]/20 text-[13px] font-light"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Speak your storm. Find your circle.
        </p>
        <div className="flex gap-8 text-[#F2EAD8]/20 text-[12px]">
          {["Privacy", "Terms", "Safety", "Contact"].map((l) => (
            <span key={l} className="hover:text-[#F2EAD8]/50 transition-colors duration-400 cursor-pointer">{l}</span>
          ))}
        </div>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#F2EAD8]/10 to-transparent mt-2" />
        <p className="text-[#F2EAD8]/10 text-[11px]">2026 Cairn. All rights reserved.</p>
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
      <Quote />
      <FinalCTA />
      <Footer />
    </main>
  );
}
