/** Placeholder for full-screen activities while progress loads. */
export function SessionSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="paper flex h-dvh flex-col px-4 pt-4" aria-busy="true" aria-label={label}>
      <div className="skeleton mx-auto h-4 w-full max-w-xl rounded-full" />
      <div className="skeleton mx-auto mt-8 h-20 w-full max-w-xl rounded-2xl" />
      <div className="skeleton mx-auto mt-6 h-64 w-full max-w-xl rounded-[var(--radius-card)]" />
    </div>
  );
}
