export function LotusMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4c2 4 6 6 10 6-2 4-6 6-10 6S8 14 6 10c4 0 8-2 10-6Z" fill="currentColor" opacity="0.85" />
      <path d="M16 12c2 5 6 8 12 8-4 6-8 8-12 8s-8-2-12-8c6 0 10-3 12-8Z" fill="currentColor" />
    </svg>
  );
}