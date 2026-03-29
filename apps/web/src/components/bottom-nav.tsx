"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    icon: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
  {
    href: "/echoes",
    label: "Echoes",
    icon: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83ZM22 12l-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12M22 17l-8.97 4.08a2 2 0 0 1-1.66 0L2.4 17",
  },
  {
    href: "/circle",
    label: "",
    isCenter: true,
    icon: "",
  },
  {
    href: "/record",
    label: "Record",
    icon: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  },
  {
    href: "/profile",
    label: "Me",
    icon: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
];

type NavVariant = "light" | "dark";

export function BottomNav({ variant = "light" }: { variant?: NavVariant }) {
  const pathname = usePathname();
  const isDark = variant === "dark";

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl border-t ${
        isDark
          ? "bg-[#2C2825]/90 border-[#F2EAD8]/[0.06]"
          : "bg-[#F5F0EA]/90 border-[#E8DFD3]/60"
      }`}
    >
      <div className="flex justify-around items-center px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-5">
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="w-[52px] h-[52px] rounded-full bg-[#6B8F71] flex items-center justify-center shadow-[0_4px_20px_rgba(107,143,113,0.4)] relative"
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-[-4px] rounded-full border-2 border-[#6B8F71]"
                  />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8a2.5 2.5 0 0 1 1.5 4.5L12 14" />
                    <circle cx="12" cy="18" r="0.5" fill="white" />
                  </svg>
                </motion.div>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-[2px] min-w-[48px] py-1 relative">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`transition-colors duration-200 ${
                  isActive
                    ? isDark ? "text-[#8FB996]" : "text-[#6B8F71]"
                    : isDark ? "text-[#F2EAD8]/40" : "text-[#8B7E74]"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </motion.div>
              <span className={`text-[9px] font-semibold tracking-[0.02em] transition-colors duration-200 ${
                isActive
                  ? isDark ? "text-[#8FB996]" : "text-[#6B8F71]"
                  : isDark ? "text-[#F2EAD8]/30" : "text-[#8B7E74]/70"
              }`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={`absolute -top-[1px] left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full ${
                    isDark ? "bg-[#8FB996]" : "bg-[#6B8F71]"
                  }`}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
