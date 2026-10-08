export function CloudMascot({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 80 60"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <ellipse cx="40" cy="42" rx="30" ry="18" fill="#89B4D4" opacity="0.85" />
      <ellipse cx="30" cy="40" rx="20" ry="16" fill="#89B4D4" />
      <ellipse cx="48" cy="36" rx="22" ry="19" fill="#A0C8E4" />
      <ellipse cx="40" cy="30" rx="18" ry="18" fill="#C8DFF0" />
      <ellipse cx="28" cy="26" rx="13" ry="13" fill="#D8EAF5" />
      <circle cx="34" cy="38" r="3.5" fill="#2A2035" opacity="0.55" />
      <circle cx="46" cy="38" r="3.5" fill="#2A2035" opacity="0.55" />
      <circle cx="35.2" cy="37" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="47.2" cy="37" r="1.2" fill="#fff" opacity="0.7" />
      <path
        d="M36 44 Q40 47 44 44"
        stroke="#2A2035"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
    </svg>
  );
}
