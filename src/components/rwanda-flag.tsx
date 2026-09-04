export function RwandaFlag({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={`shrink-0 rounded-[2px] shadow-sm ring-1 ring-black/10 ${className}`}
      role="img"
      aria-label="Flag of Rwanda"
    >
      <rect width="60" height="20" fill="#00A1DE" />
      <rect y="20" width="60" height="10" fill="#FAD201" />
      <rect y="30" width="60" height="10" fill="#20603D" />
      <g transform="translate(46 10)" fill="#E5BE01">
        <circle r="3.2" />
        {Array.from({ length: 24 }).map((_, i) => (
          <rect key={i} x="-0.35" y="-7" width="0.7" height="3" transform={`rotate(${i * 15})`} />
        ))}
      </g>
    </svg>
  );
}
