"use client";

export default function CairnLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="24" cy="40" rx="14" ry="5" fill="#8a9a7e" opacity="0.4" />
      <ellipse cx="24" cy="38" rx="12" ry="5.5" fill="#C4B08A" />
      <ellipse cx="24" cy="37" rx="12" ry="5" fill="#D9C8A9" />
      <ellipse cx="24" cy="29" rx="9" ry="4.5" fill="#B0A080" />
      <ellipse cx="24" cy="28" rx="9" ry="4" fill="#D9C8A9" />
      <ellipse cx="24" cy="27.5" rx="8.5" ry="3.5" fill="#E8DCC4" />
      <ellipse cx="24" cy="20" rx="6.5" ry="3.5" fill="#C4B08A" />
      <ellipse cx="24" cy="19" rx="6.5" ry="3" fill="#D9C8A9" />
      <ellipse cx="24" cy="18.5" rx="6" ry="2.8" fill="#E8DCC4" />
      <ellipse cx="24" cy="13" rx="4" ry="2.5" fill="#D9C8A9" />
      <ellipse cx="24" cy="12" rx="4" ry="2.2" fill="#F2EAD8" />
      <ellipse cx="22" cy="11.5" rx="1.5" ry="0.8" fill="white" opacity="0.3" />
    </svg>
  );
}
