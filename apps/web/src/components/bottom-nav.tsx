"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: "/echoes",
    label: "Echoes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 12-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12" />
        <path d="m22 17-8.97 4.08a2 2 0 0 1-1.66 0L2.4 17" />
      </svg>
    ),
  },
  {
    href: "/circle",
    label: "",
    isCenter: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[24px] h-[24px]">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8a2.5 2.5 0 0 1 1.5 4.5L12 14" />
        <circle cx="12" cy="18" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/record",
    label: "Record",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Me",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

type NavVariant = "light" | "dark";

export function BottomNav({ variant = "light" }: { variant?: NavVariant }) {
  const pathname = usePathname();
  const bgGradient =
    variant === "dark"
      ? "from-stone from-80% to-transparent"
      : "from-warm-cream from-80% to-transparent";

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 flex justify-around items-end px-4 pt-[10px] pb-[max(28px,env(safe-area-inset-bottom))] bg-gradient-to-t ${bgGradient} z-50`}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

        if (item.isCenter) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-[3px]"
            >
              <div className="w-[52px] h-[52px] rounded-full bg-moss flex items-center justify-center mb-[6px] shadow-[0_4px_20px_rgba(107,143,113,0.4)] animate-[helpPulse_3s_infinite] relative cursor-pointer hover:scale-[1.08] transition-all duration-300">
                <div className="absolute inset-[-6px] rounded-full border-2 border-moss opacity-0 animate-[helpRipple_3s_infinite]" />
                <span className="text-white">{item.icon}</span>
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-[3px] cursor-pointer min-w-[44px] min-h-[44px] justify-center transition-colors duration-200 ${
              isActive ? "text-moss" : "text-dusk"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-semibold tracking-[0.04em]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
