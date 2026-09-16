export function DotPattern({ className = '' }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, var(--dot-pattern) 1.6px, transparent 1.6px)`,
        backgroundSize: '20px 20px',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
